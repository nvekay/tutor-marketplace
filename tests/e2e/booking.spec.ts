import { expect, test } from '@playwright/test';
import { admin } from '../support/db';
import {
  auditPayments,
  booking,
  demoPeople,
  payWithTestCard,
  refundedCents,
  resetDemoStudent,
  signInAs,
  stripe,
} from './helpers';

// Lesson times within this file don't overlap, so one reset per file is enough
test.beforeAll(resetDemoStudent);
test.afterAll(() => {
  expect(auditPayments()).toContain('No discrepancies');
});

test('a guest sees free times in their own time zone and is asked to sign in', async ({ page }) => {
  await page.goto('/tutors');
  await page.locator('ul li a').first().click();
  await expect(page.getByText('Times in your time zone: America/New_York')).toBeVisible();
  await page.getByRole('link', { name: 'Next week' }).click();
  await page.locator('button[aria-pressed]').first().click();
  await expect(page.getByRole('link', { name: 'Sign in to book' })).toBeVisible();
});

test('a student books, pays on Stripe Checkout and cancels for a full refund', async ({ page }) => {
  const { tutorId } = await demoPeople();
  await signInAs(page, 'student', `/tutors/${tutorId}?week=1`);
  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: 'Book and pay' }).click();
  await payWithTestCard(page);

  await expect(page.getByRole('heading', { name: 'You’re booked' })).toBeVisible({ timeout: 60_000 });
  const sessionId = new URL(page.url()).searchParams.get('session_id')!;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const paid = await booking(session.metadata!.booking_id);
  expect(paid.status).toBe('confirmed');
  expect(paid.price_cents).toBe(4200);
  const intent = await stripe().paymentIntents.retrieve(paid.payment_intent_id!);
  expect(intent.transfer_group).toBe(`booking_${paid.id}`);

  // More than 24 hours ahead: everything back
  await page.getByRole('link', { name: 'My lessons' }).first().click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('You get the full $42.00 back')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel lesson' }).click();
  await expect(page.getByText('Lesson cancelled.')).toBeVisible();
  expect(await refundedCents(paid.payment_intent_id!)).toBe(4200);
  expect((await booking(paid.id)).payout_status).toBe('not_due');
});

test('leaving Checkout releases the slot at once', async ({ page }) => {
  const { tutorId } = await demoPeople();
  await signInAs(page, 'student', `/tutors/${tutorId}?week=1`);
  const before = await page.locator('button[aria-pressed]').count();
  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: 'Book and pay' }).click();
  await page.waitForURL(/checkout\.stripe\.com/);

  const { studentId } = await demoPeople();
  const { data: held } = await admin()
    .from('bookings')
    .select('id, checkout_session_id')
    .eq('student_id', studentId)
    .eq('status', 'pending_payment')
    .single();
  await page.goto(`/checkout/cancel?booking=${held!.id}`);
  await expect(page.getByText('Payment cancelled, nothing was charged')).toBeVisible();
  expect((await booking(held!.id)).status).toBe('expired');
  expect((await stripe().checkout.sessions.retrieve(held!.checkout_session_id!)).status).toBe('expired');
  await page.goto(`/tutors/${tutorId}?week=1`);
  await expect(page.locator('button[aria-pressed]')).toHaveCount(before);
});
