// What a signed-in browser can and can't read or change, checked with real sessions.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, anon, cleanup, createUser, insertBooking, makeListed, slot, type TestUser } from '../support/db';

let tutor: TestUser;
let hiddenTutor: TestUser;
let alice: TestUser;
let bob: TestUser;
let aliceBookingId: string;

beforeAll(async () => {
  [tutor, hiddenTutor, alice, bob] = await Promise.all([
    createUser('tutor', 'Listed Tutor'),
    createUser('tutor', 'Hidden Tutor'),
    createUser('student', 'Alice'),
    createUser('student', 'Bob'),
  ]);
  await makeListed(tutor.id);
  const { data } = await insertBooking({
    student_id: alice.id,
    tutor_id: tutor.id,
    starts_at: slot(4, 9).toISOString(),
    status: 'confirmed',
  });
  aliceBookingId = data!.id;
  await admin()
    .from('notifications')
    .insert({ user_id: alice.id, booking_id: aliceBookingId, kind: 'test', title: 'For Alice' });
});
afterAll(cleanup);

describe('visitors', () => {
  it('see listed tutors only', async () => {
    const { data } = await anon().from('tutors').select('profile_id').in('profile_id', [tutor.id, hiddenTutor.id]);
    expect(data?.map((t) => t.profile_id)).toEqual([tutor.id]);
  });

  it('see no bookings', async () => {
    const { data } = await anon().from('bookings').select('id');
    expect(data).toEqual([]);
  });
});

describe('students', () => {
  it('see their own bookings, not other students’', async () => {
    const own = await alice.client.from('bookings').select('id').eq('id', aliceBookingId);
    const other = await bob.client.from('bookings').select('id').eq('id', aliceBookingId);
    expect(own.data).toHaveLength(1);
    expect(other.data).toHaveLength(0);
  });

  it('can’t create bookings directly (only the server can, after checking the slot)', async () => {
    const { error } = await bob.client.from('bookings').insert({
      student_id: bob.id,
      tutor_id: tutor.id,
      starts_at: slot(4, 12).toISOString(),
      ends_at: slot(4, 13).toISOString(),
      price_cents: 1,
      platform_fee_cents: 0,
    });
    expect(error).not.toBeNull();
  });

  it('can’t change a booking’s status or money', async () => {
    const { data } = await alice.client
      .from('bookings')
      .update({ status: 'cancelled', refunded_cents: 4000 })
      .eq('id', aliceBookingId)
      .select();
    expect(data ?? []).toHaveLength(0);
    const { data: row } = await admin()
      .from('bookings')
      .select('status, refunded_cents')
      .eq('id', aliceBookingId)
      .single();
    expect(row).toEqual({ status: 'confirmed', refunded_cents: 0 });
  });

  it('can’t make themselves admin', async () => {
    const { error } = await alice.client.from('profiles').update({ role: 'admin' }).eq('id', alice.id);
    expect(error?.message).toMatch(/permission denied/);
  });

  it('can edit their own name and time zone', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ full_name: 'Alice B', timezone: 'Europe/Paris' })
      .eq('id', alice.id);
    expect(error).toBeNull();
  });

  it('read only their own notifications', async () => {
    expect((await alice.client.from('notifications').select('title')).data).toEqual([{ title: 'For Alice' }]);
    expect((await bob.client.from('notifications').select('title')).data).toEqual([]);
  });

  it('can’t read the Stripe webhook log', async () => {
    expect((await alice.client.from('stripe_events').select('id')).data).toEqual([]);
  });

  it('see the tutor’s name for their lesson', async () => {
    const { data } = await alice.client.from('profiles').select('full_name').eq('id', tutor.id).single();
    expect(data?.full_name).toBe('Listed Tutor');
  });
});

describe('tutors', () => {
  it('see bookings with them, including the student’s name', async () => {
    const { data } = await tutor.client
      .from('bookings')
      .select('id, student:profiles!bookings_student_id_fkey(full_name)')
      .eq('id', aliceBookingId)
      .single();
    expect(data?.student?.full_name).toBeTruthy();
  });

  it('edit their public profile but not their payout status', async () => {
    const ok = await tutor.client.from('tutors').update({ headline: 'Updated headline' }).eq('profile_id', tutor.id);
    expect(ok.error).toBeNull();
    const denied = await hiddenTutor.client
      .from('tutors')
      .update({ transfers_enabled: true })
      .eq('profile_id', hiddenTutor.id);
    expect(denied.error?.message).toMatch(/permission denied/);
  });

  it('can’t edit another tutor’s hours', async () => {
    const { error } = await hiddenTutor.client
      .from('availability_rules')
      .insert({ tutor_id: tutor.id, weekday: 1, start_minute: 0, end_minute: 60 });
    expect(error).not.toBeNull();
  });
});

describe('signup', () => {
  it('never grants admin from signup metadata', async () => {
    const { data } = await admin().auth.admin.createUser({
      email: `it-sneaky-${Date.now()}@it.example.com`,
      password: 'sneaky-password-123',
      email_confirm: true,
      user_metadata: { full_name: 'Sneaky', role: 'admin' },
    });
    const { data: profile } = await admin().from('profiles').select('role').eq('id', data.user!.id).single();
    await admin().auth.admin.deleteUser(data.user!.id);
    expect(profile?.role).toBe('student');
  });
});
