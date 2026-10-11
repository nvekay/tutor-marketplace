import 'server-only';
import { completeFinishedLessons, payDueTutors, sendReminders } from './bookings/lifecycle';
import { expireStaleHolds } from './bookings/service';
import { env } from './env';

export interface JobsReport {
  now: string;
  expiredHolds: number;
  reminders: number;
  completed: number;
  paidOut: number;
  payoutsFailed: number;
}

/**
 * Time-based work, run every few minutes by a scheduler (pg_cron in production, `pnpm cron` locally).
 * Every job is idempotent: running it twice, or late, gives the same result. Order matters: a lesson
 * completed in this run gets its payout scheduled for later, so it is never paid in the same run.
 */
export async function runJobs(now = new Date()): Promise<JobsReport> {
  const expiredHolds = await expireStaleHolds(now);
  const reminders = await sendReminders(now);
  const completed = await completeFinishedLessons(now);
  const payouts = await payDueTutors(now);
  return {
    now: now.toISOString(),
    expiredHolds,
    reminders,
    completed,
    paidOut: payouts.paid,
    payoutsFailed: payouts.failed,
  };
}

export const timeTravelAllowed = () =>
  env().ALLOW_TIME_TRAVEL ? env().ALLOW_TIME_TRAVEL === 'true' : process.env.NODE_ENV !== 'production';
