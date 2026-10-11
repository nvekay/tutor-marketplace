import 'server-only';
import { expireStaleHolds } from './bookings/service';

export interface JobsReport {
  expiredHolds: number;
}

/**
 * Time-based work, run every few minutes by a scheduler (pg_cron in production, `pnpm cron` locally).
 * Every job is idempotent: running it twice, or late, gives the same result.
 */
export async function runJobs(now = new Date()): Promise<JobsReport> {
  return { expiredHolds: await expireStaleHolds(now) };
}
