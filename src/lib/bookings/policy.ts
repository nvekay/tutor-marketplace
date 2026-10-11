// Marketplace rules for cancellations, complaints and payouts. Pure functions, unit tested.
import { platformFeeCents } from './pricing';

/** Students cancelling at least this long before the lesson get everything back */
export const FREE_CANCELLATION_HOURS = 24;
/** Share refunded to a student who cancels later than that */
export const LATE_CANCELLATION_REFUND_PERCENT = 50;
/** After a lesson, the student has this long to report a problem before the tutor is paid */
export const COMPLAINT_WINDOW_HOURS = 24;

const HOUR = 3_600_000;

export interface MoneySplit {
  /** Back to the student's card */
  refundCents: number;
  /** Transferred to the tutor */
  tutorCents: number;
  /** Kept by the platform (its commission on the part that wasn't refunded) */
  platformCents: number;
}

/** Splits what's left after a refund: the platform's commission applies to the kept part only */
export function splitAfterRefund(priceCents: number, refundCents: number, feeBps: number): MoneySplit {
  if (!Number.isInteger(refundCents) || refundCents < 0 || refundCents > priceCents)
    throw new Error(`Refund must be between 0 and ${priceCents} cents`);
  const kept = priceCents - refundCents;
  const platformCents = platformFeeCents(kept, feeBps);
  return { refundCents, tutorCents: kept - platformCents, platformCents };
}

export type Canceller = 'student' | 'tutor' | 'admin';

export type CancellationQuote = ({ allowed: true; late: boolean } & MoneySplit) | { allowed: false; reason: string };

/**
 * What happens to the money when a confirmed lesson is cancelled before it starts:
 * - student, 24 h or more ahead: full refund
 * - student, later: 50% refund, the tutor gets their share of the other half
 * - tutor or admin: full refund, always
 */
export function quoteCancellation(input: {
  by: Canceller;
  startsAt: Date;
  now: Date;
  priceCents: number;
  feeBps: number;
}): CancellationQuote {
  const { by, startsAt, now, priceCents, feeBps } = input;
  if (now >= startsAt) return { allowed: false, reason: 'The lesson has already started' };
  if (by !== 'student') return { allowed: true, late: false, ...splitAfterRefund(priceCents, priceCents, feeBps) };

  const late = startsAt.getTime() - now.getTime() < FREE_CANCELLATION_HOURS * HOUR;
  const refund = late ? Math.round((priceCents * LATE_CANCELLATION_REFUND_PERCENT) / 100) : priceCents;
  return { allowed: true, late, ...splitAfterRefund(priceCents, refund, feeBps) };
}

/** When the tutor is paid for a lesson that took place */
export const payoutDueAt = (endsAt: Date) => new Date(endsAt.getTime() + COMPLAINT_WINDOW_HOURS * HOUR);

/** Whether the student can still report a problem with a completed lesson */
export const canComplain = (endsAt: Date, now: Date) =>
  now >= endsAt && now.getTime() < endsAt.getTime() + COMPLAINT_WINDOW_HOURS * HOUR;
