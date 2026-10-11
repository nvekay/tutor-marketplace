// Scheduler entry point: `Authorization: Bearer <CRON_SECRET>`, GET (Vercel Cron) or POST (pg_cron + pg_net).
// Optional ?now=<ISO time> runs the jobs as of that time (demo and tests; see ALLOW_TIME_TRAVEL).
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { runJobs, timeTravelAllowed } from '@/lib/jobs';

function authorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function tick(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  const asOf = new URL(request.url).searchParams.get('now');
  let now = new Date();
  if (asOf) {
    if (!timeTravelAllowed()) return new Response('Time travel is disabled', { status: 403 });
    now = new Date(asOf);
    if (Number.isNaN(now.getTime())) return new Response('Invalid now', { status: 400 });
  }
  try {
    return Response.json(await runJobs(now));
  } catch (e) {
    console.error('cron tick failed', e);
    return new Response('Jobs failed', { status: 500 });
  }
}

export const GET = tick;
export const POST = tick;
