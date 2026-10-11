// The database itself refuses overlapping lessons, so two people racing for one slot can't both win.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, createUser, insertBooking, slot, type TestUser } from '../support/db';

let tutor: TestUser;
let otherTutor: TestUser;
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  [tutor, otherTutor, alice, bob] = await Promise.all([
    createUser('tutor'),
    createUser('tutor'),
    createUser('student'),
    createUser('student'),
  ]);
});
afterAll(cleanup);

describe('no double bookings', () => {
  it('lets exactly one of two simultaneous holds on the same slot through', async () => {
    const start = slot(5, 10).toISOString();
    const results = await Promise.all([
      insertBooking({ student_id: alice.id, tutor_id: tutor.id, starts_at: start }),
      insertBooking({ student_id: bob.id, tutor_id: tutor.id, starts_at: start }),
    ]);
    const failed = results.filter((r) => r.error);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    // 23P01 = exclusion violation; 40P01 = Postgres broke a deadlock between the two checks (createBooking
    // retries that once). Either way the loser is rejected.
    expect(['23P01', '40P01']).toContain(failed[0].error?.code);
  });

  it('rejects a partial overlap with the same tutor', async () => {
    await insertBooking({ student_id: alice.id, tutor_id: tutor.id, starts_at: slot(6, 10).toISOString() });
    const overlap = new Date(slot(6, 10).getTime() + 30 * 60_000);
    const { error } = await insertBooking({ student_id: bob.id, tutor_id: tutor.id, starts_at: overlap.toISOString() });
    expect(error?.code).toBe('23P01');
  });

  it('allows back-to-back lessons', async () => {
    await insertBooking({ student_id: alice.id, tutor_id: tutor.id, starts_at: slot(7, 10).toISOString() });
    const { error } = await insertBooking({
      student_id: bob.id,
      tutor_id: tutor.id,
      starts_at: slot(7, 11).toISOString(),
    });
    expect(error).toBeNull();
  });

  it('stops one student from booking two tutors at the same time', async () => {
    await insertBooking({ student_id: alice.id, tutor_id: tutor.id, starts_at: slot(8, 10).toISOString() });
    const { error } = await insertBooking({
      student_id: alice.id,
      tutor_id: otherTutor.id,
      starts_at: slot(8, 10).toISOString(),
    });
    expect(error?.code).toBe('23P01');
    expect(error?.message).toContain('no_student_overlap');
  });

  it('frees the slot once a hold expires or a lesson is cancelled', async () => {
    const start = slot(9, 10).toISOString();
    const { data: first } = await insertBooking({
      student_id: alice.id,
      tutor_id: tutor.id,
      starts_at: start,
      status: 'expired',
    });
    expect(first).not.toBeNull();
    const { error: afterExpired } = await insertBooking({
      student_id: bob.id,
      tutor_id: tutor.id,
      starts_at: start,
      status: 'cancelled',
    });
    expect(afterExpired).toBeNull();
    const { error: live } = await insertBooking({ student_id: bob.id, tutor_id: tutor.id, starts_at: start });
    expect(live).toBeNull();
  });
});
