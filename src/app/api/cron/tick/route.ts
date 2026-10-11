// Scheduler entry point: `Authorization: Bearer <CRON_SECRET>`, GET (Vercel Cron) or POST (pg_cron + pg_net).
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { runJobs } from '@/lib/jobs';

function authorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function tick(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  try {
    return Response.json(await runJobs());
  } catch (e) {
    console.error('cron tick failed', e);
    return new Response('Jobs failed', { status: 500 });
  }
}

export const GET = tick;
export const POST = tick;
