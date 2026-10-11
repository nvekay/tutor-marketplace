// Lesson lifecycle. Every status change in the app goes through canTransition, so an impossible
// sequence (e.g. paying out a lesson that was never paid) fails loudly instead of corrupting money state.

export type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'disputed' | 'cancelled' | 'expired';

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  // Paid on Checkout, or the hold ran out / the student left Checkout
  pending_payment: ['confirmed', 'expired'],
  // A payment that arrives just after the hold expired: confirmed if the time is still free, else refunded
  expired: ['confirmed', 'cancelled'],
  // The lesson time passes, someone cancels, or the card holder opens a chargeback
  confirmed: ['completed', 'cancelled', 'disputed'],
  // A complaint within 24 hours of the lesson, or a chargeback
  completed: ['disputed'],
  // Resolved by an admin: pay the tutor (completed) or refund (cancelled)
  disputed: ['completed', 'cancelled'],
  cancelled: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to);

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new Error(`Booking can't go from ${from} to ${to}`);
}

/** Statuses that occupy the tutor's and the student's time (mirrors the exclusion constraints) */
export const BLOCKING_STATUSES = ['pending_payment', 'confirmed', 'completed', 'disputed'] as const;

/** A slot is held while the student pays. Stripe Checkout sessions last at least 30 minutes. */
export const HOLD_MINUTES = 30;
/** Stripe expires the Checkout session at the same moment; this margin covers clock and webhook delays */
export const HOLD_GRACE_MINUTES = 2;

/** An unpaid hold past its expiry no longer blocks the slot (the cron job marks it expired) */
export const isStaleHold = (b: { status: string; hold_expires_at: string | null }, now: Date) =>
  b.status === 'pending_payment' &&
  b.hold_expires_at !== null &&
  new Date(b.hold_expires_at).getTime() + HOLD_GRACE_MINUTES * 60_000 < now.getTime();
