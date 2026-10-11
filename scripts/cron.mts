// Local stand-in for the production scheduler: calls /api/cron/tick once, or every minute with --watch.
//   pnpm cron            pnpm cron --watch
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error('Set CRON_SECRET');

async function tick() {
  const response = await fetch(`${site}/api/cron/tick`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  console.log(new Date().toISOString(), response.status, await response.text());
}

await tick();
if (process.argv.includes('--watch')) setInterval(() => void tick(), 60_000);
