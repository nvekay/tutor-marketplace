// Snapshot events from Stripe (payments, refunds, transfers, and v1 account updates of connected accounts).
// Every event is verified by signature and handled at most once (see handleOnce).
import type Stripe from 'stripe';
import { onChargebackClosed, onChargebackOpened } from '@/lib/bookings/lifecycle';
import { confirmFromCheckout, expireBooking } from '@/lib/bookings/service';
import { env } from '@/lib/env';
import { syncConnectedAccount } from '@/lib/payments/connect';
import { handleOnce } from '@/lib/payments/events';
import { stripe } from '@/lib/payments/stripe';

async function dispatch(event: Stripe.Event) {
  switch (event.type) {
    case 'account.updated':
      // Connected account changed (onboarding finished, requirements due); re-read it from Stripe
      await syncConnectedAccount(event.data.object.id);
      break;
    case 'checkout.session.completed':
      await confirmFromCheckout(event.data.object);
      break;
    case 'charge.dispute.created':
      await onChargebackOpened(event.data.object);
      break;
    case 'charge.dispute.closed':
      await onChargebackClosed(event.data.object);
      break;
    case 'checkout.session.expired': {
      const bookingId = event.data.object.metadata?.booking_id;
      if (bookingId) await expireBooking(bookingId, 'checkout_expired');
      break;
    }
    default:
      // Stored in stripe_events for the admin log; nothing else to do
      break;
  }
}

export async function POST(request: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhooks are not configured', { status: 503 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, request.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    const result = await handleOnce({ id: event.id, type: event.type, livemode: event.livemode, payload: event }, () =>
      dispatch(event),
    );
    return Response.json({ received: true, result });
  } catch (e) {
    console.error('stripe webhook failed', event.id, event.type, e);
    // A 500 makes Stripe deliver the event again later
    return new Response('Handler failed', { status: 500 });
  }
}
