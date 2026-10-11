// Reconciles the database with Stripe, booking by booking:
//   - the payment exists, succeeded, and matches the price
//   - refunds in Stripe add up to refunded_cents
//   - a paid payout has exactly one transfer of payout_cents to the tutor's account; an unpaid one has none
//   - a reversed payout's transfer is fully reversed
//   - nothing is stuck (unpaid holds, lessons never completed, overdue payouts)
// and checks that the money adds up overall. Exits with code 1 on any discrepancy.
//   pnpm audit:payments            ENV_FILE=.env.production.local pnpm audit:payments
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import Stripe from 'stripe';
import type { Database } from '../src/lib/db/database.types';

const envFile = process.env.ENV_FILE ?? '.env.local';
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, STRIPE_SECRET_KEY: stripeKey } = process.env;
if (!url || !secret || !stripeKey)
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and STRIPE_SECRET_KEY');

const db = createClient<Database>(url, secret, { auth: { persistSession: false } });
const stripe = new Stripe(stripeKey);
const HOUR = 3_600_000;
const now = Date.now();

const { data: bookings, error } = await db
  .from('bookings')
  .select('*, tutors(stripe_account_id)')
  .eq('seeded', false)
  .neq('status', 'expired')
  .order('created_at');
if (error) throw error;

const problems: string[] = [];
const totals = { collected: 0, refunded: 0, toTutors: 0, reversed: 0 };
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

for (const b of bookings) {
  const tag = `${b.id.slice(0, 8)} (${b.status}/${b.payout_status})`;
  const flag = (msg: string) => problems.push(`${tag}: ${msg}`);

  // Stuck states
  if (b.status === 'pending_payment' && b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now - 15 * 60_000)
    flag('unpaid hold expired more than 15 minutes ago (is the cron job running?)');
  if (b.status === 'confirmed' && new Date(b.ends_at).getTime() < now - HOUR)
    flag('lesson ended over an hour ago but is not completed');
  if (b.payout_status === 'scheduled' && b.payout_due_at && new Date(b.payout_due_at).getTime() < now - HOUR)
    flag('payout overdue by more than an hour');

  if (b.status === 'pending_payment') continue;
  if (!b.payment_intent_id) {
    flag('paid status without a payment');
    continue;
  }

  const intent = await stripe.paymentIntents.retrieve(b.payment_intent_id);
  if (intent.status !== 'succeeded') flag(`payment is ${intent.status}`);
  if (intent.amount_received !== b.price_cents)
    flag(`Stripe received ${usd(intent.amount_received)}, booking says ${usd(b.price_cents)}`);
  totals.collected += intent.amount_received;

  const refunds = await stripe.refunds.list({ payment_intent: intent.id, limit: 100 });
  const refunded = refunds.data
    .filter((r) => r.status === 'succeeded' || r.status === 'pending')
    .reduce((s, r) => s + r.amount, 0);
  if (refunded !== b.refunded_cents) flag(`Stripe refunds ${usd(refunded)}, booking says ${usd(b.refunded_cents)}`);
  totals.refunded += refunded;

  const transfers = (await stripe.transfers.list({ transfer_group: `booking_${b.id}`, limit: 100 })).data;
  const transferred = transfers.reduce((s, t) => s + t.amount, 0);
  const reversed = transfers.reduce((s, t) => s + t.amount_reversed, 0);
  totals.toTutors += transferred;
  totals.reversed += reversed;

  if (b.payout_status === 'paid' || b.payout_status === 'reversed') {
    if (transfers.length !== 1) flag(`expected one transfer, Stripe has ${transfers.length}`);
    const t = transfers[0];
    if (t) {
      if (t.id !== b.transfer_id) flag(`transfer ${t.id} is not the recorded ${b.transfer_id}`);
      if (t.amount !== b.payout_cents) flag(`transferred ${usd(t.amount)}, booking says ${usd(b.payout_cents ?? 0)}`);
      const destination = typeof t.destination === 'string' ? t.destination : t.destination?.id;
      if (destination !== b.tutors?.stripe_account_id)
        flag(`transfer went to ${destination ?? 'nowhere'}, tutor is ${b.tutors?.stripe_account_id ?? 'unknown'}`);
      if (b.payout_status === 'paid' && t.amount_reversed > 0)
        flag(`transfer reversed by ${usd(t.amount_reversed)} but payout says paid`);
      if (b.payout_status === 'reversed' && t.amount_reversed !== t.amount)
        flag('payout says reversed but the transfer is not fully reversed');
    }
  } else if (transferred - reversed > 0) {
    flag(`tutor received ${usd(transferred - reversed)} but payout is ${b.payout_status}`);
  }

  // Money can't leave twice: refunds plus what the tutor keeps never exceed what was paid
  if (refunded + transferred - reversed > intent.amount_received)
    flag(
      `refunds ${usd(refunded)} + tutor ${usd(transferred - reversed)} exceed the payment ${usd(intent.amount_received)}`,
    );
}

const paidBookings = bookings.filter((b) => b.payment_intent_id).length;
const kept = totals.collected - totals.refunded - (totals.toTutors - totals.reversed);
console.log(`Checked ${bookings.length} bookings (${paidBookings} with a payment) against Stripe`);
console.log(
  `Collected ${usd(totals.collected)} = refunded ${usd(totals.refunded)} + tutors ${usd(totals.toTutors - totals.reversed)}` +
    ` (transferred ${usd(totals.toTutors)}, reversed ${usd(totals.reversed)}) + held by the platform ${usd(kept)}`,
);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(1);
}
console.log('✓ No discrepancies');
