// Server modules against the real database. Paths that would call Stripe are stopped before the call.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findSlots } from '@/lib/availability/service';
import { completeFinishedLessons, payDueTutors, reportProblem, cancelBooking } from '@/lib/bookings/lifecycle';
import { BookingError, expireStaleHolds } from '@/lib/bookings/service';
import { handleOnce } from '@/lib/payments/events';
import { admin, cleanup, createUser, insertBooking, makeListed, slot, type TestUser } from '../support/db';

let tutor: TestUser;
let student: TestUser;
const H = 3_600_000;

beforeAll(async () => {
  [tutor, student] = await Promise.all([
    createUser('tutor', 'Lifecycle Tutor'),
    createUser('student', 'Lifecycle Student'),
  ]);
  await makeListed(tutor.id);
});
afterAll(cleanup);

const events = async (bookingId: string) =>
  (await admin().from('booking_events').select('type').eq('booking_id', bookingId).order('id')).data!.map(
    (e) => e.type,
  );
const reload = async (id: string) => (await admin().from('bookings').select('*').eq('id', id).single()).data!;

describe('webhook events are handled once', () => {
  it('skips a redelivered event', async () => {
    const id = `evt_it_${Date.now()}`;
    let calls = 0;
    const event = { id, type: 'test.event', livemode: false, payload: { id } };
    expect(await handleOnce(event, async () => void calls++)).toBe('handled');
    expect(await handleOnce(event, async () => void calls++)).toBe('duplicate');
    expect(calls).toBe(1);
    await admin().from('stripe_events').delete().eq('id', id);
  });

  it('retries an event whose handler failed', async () => {
    const id = `evt_it_fail_${Date.now()}`;
    const event = { id, type: 'test.event', livemode: false, payload: { id } };
    await expect(handleOnce(event, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    const { data: failed } = await admin().from('stripe_events').select('error, processed_at').eq('id', id).single();
    expect(failed).toEqual({ error: 'boom', processed_at: null });
    expect(await handleOnce(event, async () => {})).toBe('handled');
    await admin().from('stripe_events').delete().eq('id', id);
  });
});

describe('holds', () => {
  it('releases unpaid holds after they expire, and only those', async () => {
    const { data: stale } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: slot(10, 9).toISOString(),
      hold_expires_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    });
    const { data: fresh } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: slot(10, 11).toISOString(),
      hold_expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    });
    expect(await expireStaleHolds()).toBeGreaterThanOrEqual(1);
    expect((await reload(stale!.id)).status).toBe('expired');
    expect((await reload(fresh!.id)).status).toBe('pending_payment');
    expect(await events(stale!.id)).toEqual(['hold_expired']);
  });
});

describe('slots', () => {
  it('hide booked times and a fresh hold, but not a stale one', async () => {
    const day = 12;
    const before = await findSlots(tutor.id, { from: slot(day, 0), to: slot(day + 1, 0) });
    expect(before.map((s) => s.start.getUTCHours())).toContain(14);

    await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: slot(day, 14).toISOString(),
      status: 'confirmed',
    });
    const after = await findSlots(tutor.id, { from: slot(day, 0), to: slot(day + 1, 0) });
    const starts = after.map((s) => s.start.toISOString());
    expect(starts).not.toContain(slot(day, 14).toISOString());
    expect(starts).not.toContain(new Date(slot(day, 14).getTime() - 30 * 60_000).toISOString()); // 13:30 would overlap
    expect(starts).toContain(slot(day, 15).toISOString());
  });
});

describe('after the lesson', () => {
  it('completes finished lessons and schedules the payout 24 h later', async () => {
    const starts = new Date(Date.now() - 3 * H);
    const { data: b } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: starts.toISOString(),
      status: 'confirmed',
    });
    await completeFinishedLessons(new Date());
    const done = await reload(b!.id);
    expect(done.status).toBe('completed');
    expect(done.payout_status).toBe('scheduled');
    expect(done.payout_cents).toBe(3400);
    expect(new Date(done.payout_due_at!).getTime()).toBe(new Date(done.ends_at).getTime() + 24 * H);
    const { data: note } = await admin().from('notifications').select('kind').eq('booking_id', b!.id).single();
    expect(note?.kind).toBe('lesson_completed');

    // Running the job again changes nothing
    await completeFinishedLessons(new Date());
    expect(await events(b!.id)).toEqual(['completed']);
  });

  it('records a failed payout and keeps it scheduled for the next run', async () => {
    const { data: b } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: new Date(Date.now() - 30 * H).toISOString(),
      status: 'completed',
      payout_status: 'scheduled',
      payout_cents: 3400,
      payout_due_at: new Date(Date.now() - H).toISOString(),
      // no charge_id: the transfer can't be made (and Stripe is never called)
    });
    const result = await payDueTutors(new Date());
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect((await reload(b!.id)).payout_status).toBe('scheduled');
    expect(await events(b!.id)).toContain('payout_failed');
  });

  it('holds the payout when the student reports a problem within 24 hours', async () => {
    const { data: b } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: new Date(Date.now() - 5 * H).toISOString(),
      status: 'completed',
      payout_status: 'scheduled',
      payout_cents: 3400,
      payout_due_at: new Date(Date.now() + 20 * H).toISOString(),
    });
    await expect(
      reportProblem({ bookingId: b!.id, studentId: tutor.id, reason: 'Not my lesson at all' }),
    ).rejects.toThrow('Lesson not found');
    await expect(reportProblem({ bookingId: b!.id, studentId: student.id, reason: 'short' })).rejects.toThrow(
      BookingError,
    );
    await reportProblem({ bookingId: b!.id, studentId: student.id, reason: 'The tutor never showed up.' });
    const held = await reload(b!.id);
    expect([held.status, held.payout_status]).toEqual(['disputed', 'held']);
  });

  it('closes the complaint window after 24 hours', async () => {
    const { data: b } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: new Date(Date.now() - 33 * H).toISOString(),
      status: 'completed',
      payout_status: 'scheduled',
      payout_cents: 3400,
      payout_due_at: new Date(Date.now() - 5 * H).toISOString(),
    });
    await expect(
      reportProblem({ bookingId: b!.id, studentId: student.id, reason: 'Too late to complain now' }),
    ).rejects.toThrow('within 24 hours');
  });
});

describe('cancellation guards', () => {
  it('refuses to cancel a lesson that isn’t upcoming and paid', async () => {
    const { data: b } = await insertBooking({
      student_id: student.id,
      tutor_id: tutor.id,
      starts_at: slot(14, 9).toISOString(),
    });
    await expect(cancelBooking({ bookingId: b!.id, by: 'student', actorId: student.id })).rejects.toThrow(
      'Only upcoming paid lessons can be cancelled',
    );
    await expect(cancelBooking({ bookingId: b!.id, by: 'tutor', actorId: student.id })).rejects.toThrow(
      'Lesson not found',
    );
  });
});
