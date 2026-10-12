import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import Stripe from 'stripe';
import { admin } from '../support/db';

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function signInAs(page: Page, role: 'student' | 'tutor' | 'admin', next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByRole('button', { name: new RegExp(`As an? ${role}`) }).click();
  await page.waitForURL(
    next ? `**${next}` : role === 'tutor' ? '**/tutor' : role === 'admin' ? '**/admin' : '**/dashboard',
  );
}

export async function demoPeople() {
  const db = admin();
  const { data: student } = await db.from('profiles').select('id').eq('full_name', 'Alex Morgan').single();
  const { data: tutor } = await db.from('profiles').select('id').eq('full_name', 'Maria Keller').single();
  return { studentId: student!.id, tutorId: tutor!.id };
}

/** Removes the demo student's lessons from earlier runs so slots are free */
export async function resetDemoStudent() {
  const { studentId } = await demoPeople();
  await admin().from('bookings').delete().eq('student_id', studentId);
}

/** Fills Stripe Checkout (test mode) with Stripe's published test card */
export async function payWithTestCard(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/);
  await page.locator('#cardNumber').fill('4242 4242 4242 4242');
  await page.locator('#cardExpiry').fill('12 / 34');
  await page.locator('#cardCvc').fill('123');
  await page.locator('#billingName').fill('Alex Morgan');
  const zip = page.locator('#billingPostalCode');
  if (await zip.isVisible().catch(() => false)) await zip.fill('10001');
  const link = page.locator('#enableStripePass');
  if (await link.isChecked().catch(() => false)) await link.uncheck();
  await page.locator('[data-testid="hosted-payment-submit-button"]').click();
}

/**
 * A confirmed booking paid through the API (the same PaymentIntent + charge Checkout creates),
 * for tests that start after the payment
 */
export async function paidBooking(startsAt: Date) {
  const { studentId, tutorId } = await demoPeople();
  const db = admin();
  const { data: b, error } = await db
    .from('bookings')
    .insert({
      student_id: studentId,
      tutor_id: tutorId,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3_600_000).toISOString(),
      price_cents: 4200,
      platform_fee_cents: 630,
    })
    .select('id')
    .single();
  if (error) throw error;
  const intent = await stripe().paymentIntents.create({
    amount: 4200,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    transfer_group: `booking_${b.id}`,
    metadata: { booking_id: b.id },
  });
  await db
    .from('bookings')
    .update({ status: 'confirmed', payment_intent_id: intent.id, charge_id: intent.latest_charge as string })
    .eq('id', b.id);
  return { id: b.id, paymentIntentId: intent.id };
}

export const booking = async (id: string) => (await admin().from('bookings').select('*').eq('id', id).single()).data!;

export const refundedCents = async (paymentIntentId: string) =>
  (await stripe().refunds.list({ payment_intent: paymentIntentId })).data.reduce((s, r) => s + r.amount, 0);

/** Runs `pnpm audit:payments`: the database and Stripe must agree on every booking */
export function auditPayments(): string {
  return execFileSync(process.execPath, ['scripts/audit-payments.mts'], { encoding: 'utf8' });
}
