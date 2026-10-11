// Thin events from Stripe (Accounts v2): a small notification that names the account that changed.
// We don't trust the notification's content; we re-read the account from Stripe and store its state.
import { env } from '@/lib/env';
import { syncConnectedAccount } from '@/lib/payments/connect';
import { handleOnce } from '@/lib/payments/events';
import { stripe } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  const secret = env().STRIPE_THIN_WEBHOOK_SECRET;
  if (!secret) return new Response('Thin events are not configured', { status: 503 });

  const body = await request.text();
  let notification;
  try {
    notification = stripe().parseEventNotification(body, request.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const related = 'related_object' in notification ? notification.related_object : null;
  const relatedId = related && 'id' in related && typeof related.id === 'string' ? related.id : '';
  const accountId = notification.type.startsWith('v2.core.account') && relatedId.startsWith('acct_') ? relatedId : null;

  try {
    const result = await handleOnce(
      { id: notification.id, type: notification.type, livemode: notification.livemode, payload: JSON.parse(body) },
      async () => {
        if (accountId) await syncConnectedAccount(accountId);
      },
    );
    return Response.json({ received: true, result });
  } catch (e) {
    console.error('stripe thin event failed', notification.id, e);
    // A 500 makes Stripe deliver the event again later
    return new Response('Handler failed', { status: 500 });
  }
}
