import 'server-only';
// Booking and payment flow (separate charges and transfers):
//   1. createBooking: hold the slot (pending_payment) and open a Stripe Checkout session on the platform account
//   2. confirmFromCheckout: the session is paid → confirmed (from the webhook and from the success page, idempotent)
//   3. expireBooking / expireStaleHolds: unpaid holds are released
// The money stays on the platform until the lesson is over; the transfer to the tutor happens later (payouts).
import type Stripe from 'stripe';
import { isBookable } from '../availability/slots';
import { loadSlotQuery } from '../availability/service';
import { createSupabaseAdminClient } from '../db/admin';
import type { Database, Json } from '../db/database.types';
import { env } from '../env';
import { stripe } from '../payments/stripe';
import { lessonPriceCents, platformFeeCents } from './pricing';
import { assertTransition, HOLD_GRACE_MINUTES, HOLD_MINUTES, type BookingStatus } from './state';

export type Booking = Database['public']['Tables']['bookings']['Row'];
type Actor = 'student' | 'tutor' | 'admin' | 'system' | 'stripe';

export class BookingError extends Error {}

const db = () => createSupabaseAdminClient();

export async function logBookingEvent(
  bookingId: string,
  type: string,
  actor: { role: Actor; id?: string },
  data: Record<string, Json> = {},
) {
  await db()
    .from('booking_events')
    .insert({ booking_id: bookingId, type, actor_role: actor.role, actor_id: actor.id ?? null, data });
}

export async function notify(userId: string, bookingId: string, kind: string, title: string, body = '') {
  await db().from('notifications').insert({ user_id: userId, booking_id: bookingId, kind, title, body });
}

/** Moves a booking to a new status only if it is still in the expected one (safe under concurrency) */
export async function transition(
  booking: Pick<Booking, 'id' | 'status'>,
  to: BookingStatus,
  changes: Database['public']['Tables']['bookings']['Update'] = {},
): Promise<Booking | null> {
  assertTransition(booking.status, to);
  const { data, error } = await db()
    .from('bookings')
    .update({ ...changes, status: to })
    .eq('id', booking.id)
    .eq('status', booking.status)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Releases unpaid holds whose Checkout session has expired; returns how many */
export async function expireStaleHolds(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - HOLD_GRACE_MINUTES * 60_000).toISOString();
  const { data, error } = await db()
    .from('bookings')
    .update({ status: 'expired', hold_expires_at: null })
    .eq('status', 'pending_payment')
    .lt('hold_expires_at', cutoff)
    .select('id');
  if (error) throw error;
  for (const b of data) await logBookingEvent(b.id, 'hold_expired', { role: 'system' });
  return data.length;
}

export const lessonLabel = (start: Date, timezone: string) =>
  start.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
    timeZoneName: 'short',
  });

/**
 * Holds the slot for the student and opens Stripe Checkout. Returns the Checkout URL.
 * Throws BookingError with a message for the student when the time can't be booked.
 */
export async function createBooking(input: {
  student: { id: string; email: string; timezone: string };
  tutorId: string;
  startsAt: Date;
  now?: Date;
}): Promise<string> {
  const { student, tutorId, startsAt, now = new Date() } = input;
  if (Number.isNaN(startsAt.getTime())) throw new BookingError('Choose a time');

  const { data: tutor } = await db()
    .from('tutors')
    .select('listed, transfers_enabled, stripe_account_id, hourly_rate_cents, lesson_minutes, profiles(full_name)')
    .eq('profile_id', tutorId)
    .maybeSingle();
  if (!tutor?.listed || !tutor.transfers_enabled || !tutor.stripe_account_id)
    throw new BookingError('This tutor isn’t taking bookings right now');
  if (tutorId === student.id) throw new BookingError('You can’t book yourself');

  const endsAt = new Date(startsAt.getTime() + tutor.lesson_minutes * 60_000);

  // Coming back to the same slot after leaving Checkout: reuse the open session
  const { data: existing } = await db()
    .from('bookings')
    .select('id, checkout_session_id, hold_expires_at')
    .eq('student_id', student.id)
    .eq('tutor_id', tutorId)
    .eq('starts_at', startsAt.toISOString())
    .eq('status', 'pending_payment')
    .maybeSingle();
  if (existing?.checkout_session_id) {
    const session = await stripe().checkout.sessions.retrieve(existing.checkout_session_id);
    if (session.status === 'open' && session.url) return session.url;
  }

  await expireStaleHolds(now);
  const query = await loadSlotQuery(tutorId, { from: startsAt, to: endsAt }, now);
  if (!query || !isBookable(query, startsAt))
    throw new BookingError('This time is no longer available. Pick another one.');

  const price = lessonPriceCents(tutor.hourly_rate_cents, tutor.lesson_minutes);
  const holdUntil = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const insertHold = () =>
    db()
      .from('bookings')
      .insert({
        student_id: student.id,
        tutor_id: tutorId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        price_cents: price,
        platform_fee_cents: platformFeeCents(price, env().PLATFORM_FEE_BPS),
        hold_expires_at: holdUntil.toISOString(),
      })
      .select()
      .single();
  let { data: booking, error } = await insertHold();
  // Two simultaneous inserts for one slot can deadlock on the exclusion constraints; Postgres aborts one
  // of them (40P01). Retrying once gives a clear answer: the slot is ours, or 23P01 below.
  if (error?.code === '40P01') ({ data: booking, error } = await insertHold());
  if (error || !booking) {
    // The exclusion constraints: someone else got this slot first, or the student already has a lesson then
    if (error?.code === '23P01')
      throw new BookingError(
        error.message.includes('no_student_overlap')
          ? 'You already have a lesson at this time'
          : 'Someone just booked this time. Pick another one.',
      );
    throw error ?? new Error('Booking was not created');
  }
  await logBookingEvent(booking.id, 'created', { role: 'student', id: student.id }, { price_cents: price });

  const tutorName = tutor.profiles?.full_name ?? 'your tutor';
  const site = env().NEXT_PUBLIC_SITE_URL;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        allowed_payment_method_types: ['card'],
        adaptive_pricing: { enabled: false },
        customer_email: student.email,
        client_reference_id: booking.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: price,
              product_data: {
                name: `${tutor.lesson_minutes}-minute lesson with ${tutorName}`,
                description: lessonLabel(startsAt, student.timezone),
              },
            },
          },
        ],
        // Charged on the platform account; the tutor's share is transferred after the lesson
        payment_intent_data: {
          transfer_group: `booking_${booking.id}`,
          description: `Lesson ${booking.id}`,
          metadata: { booking_id: booking.id },
        },
        metadata: { booking_id: booking.id },
        // Demo visitors land here straight from the site, so tell them which card works in test mode
        ...(env().STRIPE_SECRET_KEY?.startsWith('sk_test_') && {
          custom_text: {
            submit: { message: 'Test mode: pay with card 4242 4242 4242 4242, any future date and any CVC.' },
          },
        }),
        expires_at: Math.floor(holdUntil.getTime() / 1000),
        success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/checkout/cancel?booking=${booking.id}`,
      },
      { idempotencyKey: `booking:${booking.id}:checkout` },
    );
  } catch (e) {
    // Release the slot right away instead of waiting for the hold to run out
    await transition(booking, 'expired', { hold_expires_at: null });
    await logBookingEvent(booking.id, 'checkout_failed', { role: 'system' }, { message: String(e) });
    throw e;
  }

  await db().from('bookings').update({ checkout_session_id: session.id }).eq('id', booking.id);
  await logBookingEvent(booking.id, 'checkout_started', { role: 'student', id: student.id }, { session: session.id });
  return session.url!;
}

export async function loadBooking(id: string): Promise<Booking | null> {
  const { data } = await db().from('bookings').select('*').eq('id', id).maybeSingle();
  return data;
}

/**
 * Records a paid Checkout session. Called by the webhook and by the success page; whichever
 * comes first does the work, the other finds the booking already confirmed.
 */
export async function confirmFromCheckout(session: Stripe.Checkout.Session): Promise<Booking | null> {
  const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
  if (!bookingId) return null;
  const booking = await loadBooking(bookingId);
  if (!booking || session.payment_status !== 'paid') return booking;
  if (booking.status !== 'pending_payment' && booking.status !== 'expired') return booking; // already handled

  if (session.amount_total !== booking.price_cents || session.currency !== booking.currency)
    throw new Error(
      `Booking ${booking.id}: paid ${session.amount_total} ${session.currency}, expected ${booking.price_cents}`,
    );

  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!intentId) throw new Error(`Booking ${booking.id}: paid session without a payment intent`);
  const intent = await stripe().paymentIntents.retrieve(intentId);
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  const paid = { payment_intent_id: intentId, charge_id: chargeId ?? null, checkout_session_id: session.id };

  let confirmed: Booking | null;
  try {
    confirmed = await transition(booking, 'confirmed', { ...paid, hold_expires_at: null });
  } catch (e) {
    // Paid after the hold expired and someone else booked the time meanwhile: refund in full
    if ((e as { code?: string }).code !== '23P01') throw e;
    return refundLatePayment(booking, paid);
  }
  if (!confirmed) return loadBooking(booking.id); // a concurrent call confirmed it

  await logBookingEvent(booking.id, 'paid', { role: 'stripe' }, { payment_intent: intentId, charge: chargeId ?? null });
  const lesson = await lessonSummary(confirmed);
  await notify(
    confirmed.student_id,
    confirmed.id,
    'booking_confirmed',
    `Lesson booked with ${lesson.tutorName}`,
    lesson.whenForStudent,
  );
  await notify(
    confirmed.tutor_id,
    confirmed.id,
    'booking_new',
    `New lesson with ${lesson.studentName}`,
    lesson.whenForTutor,
  );
  return confirmed;
}

async function refundLatePayment(
  booking: Booking,
  paid: { payment_intent_id: string; charge_id: string | null; checkout_session_id: string },
): Promise<Booking | null> {
  await stripe().refunds.create(
    { payment_intent: paid.payment_intent_id, reason: 'requested_by_customer', metadata: { booking_id: booking.id } },
    { idempotencyKey: `booking:${booking.id}:late-refund` },
  );
  const cancelled = await transition(booking, 'cancelled', {
    ...paid,
    refunded_cents: booking.price_cents,
    payout_status: 'not_due',
    cancelled_by: 'system',
    cancel_reason: 'Paid after the hold expired and the time was taken; refunded in full',
  });
  await logBookingEvent(booking.id, 'late_payment_refunded', { role: 'system' }, { amount: booking.price_cents });
  await notify(
    booking.student_id,
    booking.id,
    'booking_refunded',
    'Your payment was refunded',
    'The time was booked by someone else while you were paying. You’ve been refunded in full.',
  );
  return cancelled;
}

/** Checkout session expired or abandoned: release the slot */
export async function expireBooking(bookingId: string, reason: string): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking || booking.status !== 'pending_payment') return;
  const expired = await transition(booking, 'expired', { hold_expires_at: null });
  if (expired) await logBookingEvent(booking.id, 'hold_released', { role: 'system' }, { reason });
}

/**
 * The student left Checkout: expire the session at Stripe first (so it can't be paid any more), then release
 * the slot. If it turns out the session was paid in the meantime, the payment is recorded instead.
 */
export async function abandonCheckout(bookingId: string, studentId: string): Promise<Booking | null> {
  const booking = await loadBooking(bookingId);
  if (!booking || booking.student_id !== studentId) return null;
  if (booking.status !== 'pending_payment' || !booking.checkout_session_id) return booking;

  const session = await stripe().checkout.sessions.retrieve(booking.checkout_session_id);
  if (session.status === 'complete') return confirmFromCheckout(session);
  if (session.status === 'open') {
    try {
      await stripe().checkout.sessions.expire(session.id);
    } catch {
      // Completed a moment ago: record the payment
      return confirmFromCheckout(await stripe().checkout.sessions.retrieve(session.id));
    }
  }
  await expireBooking(booking.id, 'left_checkout');
  return loadBooking(booking.id);
}

export async function lessonSummary(booking: Booking) {
  const { data: people } = await db()
    .from('profiles')
    .select('id, full_name, timezone')
    .in('id', [booking.student_id, booking.tutor_id]);
  const student = people?.find((p) => p.id === booking.student_id);
  const tutor = people?.find((p) => p.id === booking.tutor_id);
  return {
    tutorName: tutor?.full_name ?? 'your tutor',
    studentName: student?.full_name ?? 'a student',
    whenForStudent: lessonLabel(new Date(booking.starts_at), student?.timezone ?? 'UTC'),
    whenForTutor: lessonLabel(new Date(booking.starts_at), tutor?.timezone ?? 'UTC'),
  };
}
