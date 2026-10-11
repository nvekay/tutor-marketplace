import { expect, test } from '@playwright/test';
import { admin } from '../support/db';
import { auditPayments, booking, paidBooking, refundedCents, resetDemoStudent, signInAs, stripe } from './helpers';

// Lesson times within this file don't overlap, so one reset per file is enough
test.beforeAll(resetDemoStudent);
test.afterAll(() => {
  expect(auditPayments()).toContain('No discrepancies');
});

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

test('a late cancellation refunds half and pays the tutor their share of the rest', async ({ page }) => {
  const b = await paidBooking(hoursFromNow(5));
  await signInAs(page, 'student');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('you get $21.00 back (50%)')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel lesson' }).click();
  await expect(page.getByText('Lesson cancelled.')).toBeVisible();

  const cancelled = await booking(b.id);
  expect(cancelled.refunded_cents).toBe(2100);
  expect(cancelled.payout_cents).toBe(1785); // 85% of the kept $21
  expect(await refundedCents(b.paymentIntentId)).toBe(2100);
});

test('an admin resolves a complaint with a partial refund and pays the tutor the rest', async ({ page }) => {
  const b = await paidBooking(hoursFromNow(-4));
  await admin()
    .from('bookings')
    .update({ status: 'disputed', payout_status: 'held', dispute_reason: 'Half of the lesson had no audio.' })
    .eq('id', b.id);

  await signInAs(page, 'admin');
  await page.goto(`/admin/bookings/${b.id}`);
  await page.getByRole('button', { name: 'Half' }).click();
  await page.getByRole('button', { name: 'Refund $21.00, pay the tutor the rest' }).click();
  await expect(page.getByText('Resolved: $21.00 refunded')).toBeVisible();
  expect(await refundedCents(b.paymentIntentId)).toBe(2100);

  await page.reload();
  await page.getByRole('button', { name: /Skip the complaint window and pay/ }).click();
  await expect(page.getByText('Tutor paid').first()).toBeVisible();
  const paid = await booking(b.id);
  const transfer = await stripe().transfers.retrieve(paid.transfer_id!);
  expect(transfer.amount).toBe(1785);
  expect(transfer.source_transaction).toBe(paid.charge_id);
});

test('a finished lesson is paid out only after the 24-hour complaint window', async ({ request }) => {
  const b = await paidBooking(hoursFromNow(-2));
  const tick = (now?: Date) =>
    request.post(`/api/cron/tick${now ? `?now=${now.toISOString()}` : ''}`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

  await tick();
  const completed = await booking(b.id);
  expect([completed.status, completed.payout_status]).toEqual(['completed', 'scheduled']);

  const due = new Date(completed.payout_due_at!).getTime();
  await tick(new Date(due - 60_000));
  expect((await booking(b.id)).payout_status).toBe('scheduled');
  await tick(new Date(due + 60_000));
  const paid = await booking(b.id);
  expect(paid.payout_status).toBe('paid');
  expect((await stripe().transfers.retrieve(paid.transfer_id!)).amount).toBe(3570);

  // Running the jobs again never pays twice
  const again = (await (await tick(new Date(due + 2 * 60_000))).json()) as { paidOut: number };
  expect(again.paidOut).toBe(0);
});
