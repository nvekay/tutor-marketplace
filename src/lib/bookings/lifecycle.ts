import 'server-only';
// What happens to a paid lesson: cancellation with a refund, completion, the complaint window,
// the payout to the tutor, admin decisions on complaints, and chargebacks.
// Rule of thumb for every money move: call Stripe first with an idempotency key, then record it with a
// conditional update. A retry repeats the same Stripe call (a no-op) and finishes the record.
import type Stripe from 'stripe';
import { createSupabaseAdminClient } from '../db/admin';
import { env } from '../env';
import { stripe } from '../payments/stripe';
import { canComplain, payoutDueAt, quoteCancellation, splitAfterRefund, type Canceller } from './policy';
import { BookingError, lessonSummary, loadBooking, logBookingEvent, notify, transition, type Booking } from './service';

const db = () => createSupabaseAdminClient();

function isIdempotencyConflict(e: unknown) {
  return (e as { type?: string }).type === 'StripeIdempotencyError';
}

async function refund(booking: Booking, amountCents: number, purpose: string) {
  if (amountCents <= 0) return null;
  if (!booking.payment_intent_id) throw new Error(`Booking ${booking.id} has no payment to refund`);
  return stripe().refunds.create(
    {
      payment_intent: booking.payment_intent_id,
      amount: amountCents,
      reason: 'requested_by_customer',
      metadata: { booking_id: booking.id, purpose },
    },
    { idempotencyKey: `booking:${booking.id}:refund:${purpose}` },
  );
}

async function notifyAdmins(bookingId: string, kind: string, title: string, body = '') {
  const { data: admins } = await db().from('profiles').select('id').eq('role', 'admin');
  for (const a of admins ?? []) await notify(a.id, bookingId, kind, title, body);
}

// ─── cancellation ────────────────────────────────────────────────────────────

/** Cancels a confirmed lesson before it starts and refunds the student per the policy */
export async function cancelBooking(input: {
  bookingId: string;
  by: Canceller;
  actorId: string;
  reason?: string;
  now?: Date;
}): Promise<Booking> {
  const { bookingId, by, actorId, reason, now = new Date() } = input;
  const booking = await loadBooking(bookingId);
  const isParty = booking && (by === 'admin' || (by === 'student' ? booking.student_id : booking.tutor_id) === actorId);
  if (!booking || !isParty) throw new BookingError('Lesson not found');
  if (booking.status !== 'confirmed') throw new BookingError('Only upcoming paid lessons can be cancelled');

  const quote = quoteCancellation({
    by,
    startsAt: new Date(booking.starts_at),
    now,
    priceCents: booking.price_cents,
    feeBps: env().PLATFORM_FEE_BPS,
  });
  if (!quote.allowed) throw new BookingError(quote.reason);

  try {
    await refund(booking, quote.refundCents, 'cancellation');
  } catch (e) {
    // The other side cancelled at the same moment with a different refund: theirs wins
    if (isIdempotencyConflict(e)) throw new BookingError('This lesson is already being cancelled');
    throw e;
  }

  const cancelled = await transition(booking, 'cancelled', {
    refunded_cents: quote.refundCents,
    // A late cancellation still pays the tutor their share of the kept half, after the lesson time
    payout_status: quote.tutorCents > 0 ? 'scheduled' : 'not_due',
    payout_cents: quote.tutorCents > 0 ? quote.tutorCents : null,
    payout_due_at: quote.tutorCents > 0 ? booking.ends_at : null,
    cancelled_by: by,
    cancel_reason: reason?.trim() || null,
  });
  if (!cancelled) return (await loadBooking(bookingId))!;

  await logBookingEvent(
    booking.id,
    'cancelled',
    { role: by, id: actorId },
    {
      refund_cents: quote.refundCents,
      tutor_cents: quote.tutorCents,
      late: quote.late,
    },
  );
  const lesson = await lessonSummary(booking);
  const refundText = `Refund: $${(quote.refundCents / 100).toFixed(2)} to the card used.`;
  if (by !== 'student')
    await notify(
      booking.student_id,
      booking.id,
      'booking_cancelled',
      `${lesson.tutorName} cancelled your lesson`,
      `${lesson.whenForStudent}. ${refundText}`,
    );
  else await notify(booking.student_id, booking.id, 'booking_cancelled', 'Lesson cancelled', refundText);
  if (by !== 'tutor')
    await notify(
      booking.tutor_id,
      booking.id,
      'booking_cancelled',
      `Lesson with ${lesson.studentName} cancelled`,
      quote.tutorCents > 0
        ? `${lesson.whenForTutor}. Late cancellation: you still receive $${(quote.tutorCents / 100).toFixed(2)}.`
        : lesson.whenForTutor,
    );
  return cancelled;
}

// ─── complaints ──────────────────────────────────────────────────────────────

/** The student reports a problem within 24 hours after the lesson: the payout is held for an admin */
export async function reportProblem(input: {
  bookingId: string;
  studentId: string;
  reason: string;
  now?: Date;
}): Promise<Booking> {
  const { bookingId, studentId, reason, now = new Date() } = input;
  const booking = await loadBooking(bookingId);
  if (!booking || booking.student_id !== studentId) throw new BookingError('Lesson not found');
  if (booking.status !== 'completed' || booking.payout_status !== 'scheduled')
    throw new BookingError('Problems can be reported for completed lessons only');
  if (!canComplain(new Date(booking.ends_at), now))
    throw new BookingError('Problems can be reported within 24 hours after the lesson');
  const text = reason.trim();
  if (text.length < 10) throw new BookingError('Tell us what went wrong (at least 10 characters)');

  const disputed = await transition(booking, 'disputed', {
    payout_status: 'held',
    dispute_reason: text.slice(0, 2000),
  });
  if (!disputed) throw new BookingError('This lesson has just changed. Reload the page.');
  await logBookingEvent(booking.id, 'complaint', { role: 'student', id: studentId }, { reason: text.slice(0, 2000) });
  const lesson = await lessonSummary(booking);
  await notify(
    booking.tutor_id,
    booking.id,
    'complaint',
    `${lesson.studentName} reported a problem`,
    'The payout for this lesson is on hold until an admin reviews it.',
  );
  await notifyAdmins(booking.id, 'complaint', 'New complaint to review', text.slice(0, 200));
  return disputed;
}

/** An admin decides a complaint: refund part or all of the price; the tutor is paid the rest right away */
export async function resolveComplaint(input: {
  bookingId: string;
  adminId: string;
  refundCents: number;
  note?: string;
  now?: Date;
}): Promise<Booking> {
  const { bookingId, adminId, refundCents, note, now = new Date() } = input;
  const booking = await loadBooking(bookingId);
  if (!booking || booking.status !== 'disputed') throw new BookingError('Nothing to resolve for this lesson');
  if (booking.stripe_dispute_id) throw new BookingError('This is a chargeback: the card holder’s bank decides it');

  const split = splitAfterRefund(booking.price_cents, refundCents, env().PLATFORM_FEE_BPS);
  await refund(booking, refundCents, 'complaint');
  const full = refundCents === booking.price_cents;
  const resolved = await transition(booking, full ? 'cancelled' : 'completed', {
    refunded_cents: refundCents,
    payout_status: full ? 'not_due' : 'scheduled',
    payout_cents: full ? null : split.tutorCents,
    payout_due_at: full ? null : now.toISOString(),
    resolution: note?.trim() || (full ? 'Refunded in full' : refundCents > 0 ? 'Partial refund' : 'Tutor paid'),
    cancelled_by: full ? 'admin' : null,
  });
  if (!resolved) throw new BookingError('This lesson has just changed. Reload the page.');

  await logBookingEvent(
    booking.id,
    'complaint_resolved',
    { role: 'admin', id: adminId },
    {
      refund_cents: refundCents,
      tutor_cents: split.tutorCents,
    },
  );
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  await notify(
    booking.student_id,
    booking.id,
    'complaint_resolved',
    'Your complaint was reviewed',
    refundCents > 0 ? `Refund: ${money(refundCents)}.` : 'No refund was issued.',
  );
  await notify(
    booking.tutor_id,
    booking.id,
    'complaint_resolved',
    'A complaint was reviewed',
    split.tutorCents > 0 ? `You receive ${money(split.tutorCents)}.` : 'The student was refunded in full.',
  );
  return resolved;
}

// ─── reviews ─────────────────────────────────────────────────────────────────

export async function leaveReview(input: { bookingId: string; studentId: string; rating: number; comment: string }) {
  const booking = await loadBooking(input.bookingId);
  if (!booking || booking.student_id !== input.studentId) throw new BookingError('Lesson not found');
  if (booking.status !== 'completed') throw new BookingError('You can review a lesson after it took place');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    throw new BookingError('Choose 1 to 5 stars');
  const { error } = await db()
    .from('reviews')
    .insert({
      booking_id: booking.id,
      tutor_id: booking.tutor_id,
      student_id: booking.student_id,
      rating: input.rating,
      comment: input.comment.trim().slice(0, 1000),
    });
  if (error?.code === '23505') throw new BookingError('You already reviewed this lesson');
  if (error) throw error;
}

// ─── scheduled jobs ──────────────────────────────────────────────────────────

/** Lessons whose time has passed become completed; the payout is scheduled after the complaint window */
export async function completeFinishedLessons(now = new Date()): Promise<number> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .lte('ends_at', now.toISOString())
    .limit(200);
  if (error) throw error;
  let count = 0;
  for (const booking of data) {
    const completed = await transition(booking, 'completed', {
      payout_status: 'scheduled',
      payout_cents: booking.price_cents - booking.platform_fee_cents,
      payout_due_at: payoutDueAt(new Date(booking.ends_at)).toISOString(),
    });
    if (!completed) continue;
    count++;
    await logBookingEvent(booking.id, 'completed', { role: 'system' });
    const lesson = await lessonSummary(booking);
    await notify(
      booking.student_id,
      booking.id,
      'lesson_completed',
      `How was your lesson with ${lesson.tutorName}?`,
      'Leave a review, or report a problem within 24 hours.',
    );
  }
  return count;
}

/** Transfers the tutor's share for every payout that is due */
export async function payDueTutors(now = new Date()): Promise<{ paid: number; failed: number }> {
  const { data, error } = await db()
    .from('bookings')
    .select('*, tutors(stripe_account_id)')
    .eq('payout_status', 'scheduled')
    .lte('payout_due_at', now.toISOString())
    .limit(100);
  if (error) throw error;
  let paid = 0;
  let failed = 0;
  for (const { tutors, ...booking } of data) {
    try {
      const destination = tutors?.stripe_account_id;
      if (!destination || !booking.charge_id || !booking.payout_cents)
        throw new Error('Missing account, charge or amount');
      const transfer = await stripe().transfers.create(
        {
          amount: booking.payout_cents,
          currency: booking.currency,
          destination,
          // Ties the transfer to the student's payment: it can't outrun the funds it comes from
          source_transaction: booking.charge_id,
          transfer_group: `booking_${booking.id}`,
          description: `Lesson ${booking.id}`,
          metadata: { booking_id: booking.id },
        },
        // A new payout_due_at (e.g. after a won chargeback) means a new transfer
        { idempotencyKey: `booking:${booking.id}:transfer:${booking.payout_due_at}` },
      );
      const { data: updated } = await db()
        .from('bookings')
        .update({ payout_status: 'paid', transfer_id: transfer.id })
        .eq('id', booking.id)
        .eq('payout_status', 'scheduled')
        .select('id');
      if (!updated?.length) continue;
      paid++;
      await logBookingEvent(
        booking.id,
        'paid_out',
        { role: 'system' },
        { transfer: transfer.id, amount: booking.payout_cents },
      );
      await notify(
        booking.tutor_id,
        booking.id,
        'payout',
        `You were paid $${(booking.payout_cents / 100).toFixed(2)}`,
        'Sent to your Stripe balance.',
      );
    } catch (e) {
      failed++;
      console.error('payout failed', booking.id, e);
      await logBookingEvent(
        booking.id,
        'payout_failed',
        { role: 'system' },
        { message: e instanceof Error ? e.message : String(e) },
      );
    }
  }
  return { paid, failed };
}

/** One reminder to both sides about 24 hours before the lesson */
export async function sendReminders(now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 24 * 3_600_000).toISOString();
  const { data, error } = await db()
    .from('bookings')
    .update({ reminder_sent_at: now.toISOString() })
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gt('starts_at', now.toISOString())
    .lte('starts_at', soon)
    .select('*');
  if (error) throw error;
  for (const booking of data) {
    const lesson = await lessonSummary(booking);
    await notify(
      booking.student_id,
      booking.id,
      'reminder',
      `Lesson with ${lesson.tutorName} tomorrow`,
      lesson.whenForStudent,
    );
    await notify(
      booking.tutor_id,
      booking.id,
      'reminder',
      `Lesson with ${lesson.studentName} tomorrow`,
      lesson.whenForTutor,
    );
  }
  return data.length;
}

// ─── chargebacks (webhooks) ──────────────────────────────────────────────────

/** A card holder disputed the payment with their bank: hold or pull back the tutor's payout */
export async function onChargebackOpened(dispute: Stripe.Dispute): Promise<void> {
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
  const { data: booking } = await db().from('bookings').select('*').eq('charge_id', chargeId).maybeSingle();
  if (!booking || booking.stripe_dispute_id === dispute.id) return;

  const changes: Parameters<typeof transition>[2] = {
    stripe_dispute_id: dispute.id,
    dispute_reason: `Chargeback: ${dispute.reason.replaceAll('_', ' ')}`,
  };
  if (booking.payout_status === 'paid' && booking.transfer_id) {
    await stripe().transfers.createReversal(
      booking.transfer_id,
      { metadata: { booking_id: booking.id, dispute: dispute.id } },
      { idempotencyKey: `booking:${booking.id}:reversal:${dispute.id}` },
    );
    changes.payout_status = 'reversed';
  } else if (booking.payout_status === 'scheduled' || booking.payout_status === 'none') {
    changes.payout_status = 'held';
  }

  if (booking.status === 'confirmed' || booking.status === 'completed') await transition(booking, 'disputed', changes);
  else await db().from('bookings').update(changes).eq('id', booking.id);

  await logBookingEvent(
    booking.id,
    'chargeback_opened',
    { role: 'stripe' },
    { dispute: dispute.id, reason: dispute.reason, amount: dispute.amount },
  );
  await notifyAdmins(
    booking.id,
    'chargeback',
    'Chargeback opened',
    `${dispute.reason.replaceAll('_', ' ')}: $${(dispute.amount / 100).toFixed(2)}`,
  );
}

/** The bank decided: won → the tutor is paid again (or the lesson stays booked); lost → the money is gone */
export async function onChargebackClosed(dispute: Stripe.Dispute, now = new Date()): Promise<void> {
  const { data: booking } = await db().from('bookings').select('*').eq('stripe_dispute_id', dispute.id).maybeSingle();
  if (!booking || booking.resolution?.startsWith('Chargeback')) return;
  const won = dispute.status !== 'lost';
  const lessonOver = new Date(booking.ends_at) <= now;

  const changes: Parameters<typeof transition>[2] = {
    resolution: won ? 'Chargeback won' : 'Chargeback lost: the bank returned the payment to the card holder',
  };
  if (won && (booking.payout_status === 'held' || booking.payout_status === 'reversed')) {
    // Before the lesson: back to "none" and the completion job schedules it; after: pay now
    changes.payout_status = lessonOver ? 'scheduled' : 'none';
    changes.payout_due_at = lessonOver ? now.toISOString() : null;
  } else if (!won && booking.payout_status === 'held') {
    changes.payout_status = 'not_due';
  }

  if (booking.status === 'disputed')
    await transition(booking, won ? (lessonOver ? 'completed' : 'confirmed') : 'cancelled', {
      ...changes,
      ...(won ? {} : { cancelled_by: 'system' as const, cancel_reason: 'Chargeback lost' }),
    });
  else await db().from('bookings').update(changes).eq('id', booking.id);

  await logBookingEvent(
    booking.id,
    won ? 'chargeback_won' : 'chargeback_lost',
    { role: 'stripe' },
    { dispute: dispute.id },
  );
  await notifyAdmins(booking.id, 'chargeback', won ? 'Chargeback won' : 'Chargeback lost');
}
