import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

type Db = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Service role client: bypasses row level security, for setting up and inspecting test data */
export const admin = (): Db =>
  createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

/** A client with no session, like a visitor's browser */
export const anon = (): Db =>
  createClient<Database>(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });

export interface TestUser {
  id: string;
  email: string;
  /** Signed in as this user: everything goes through row level security */
  client: Db;
}

const created: string[] = [];
const run = Math.random().toString(36).slice(2, 8);
let n = 0;

/** Creates a confirmed user through the normal signup trigger (metadata decides the role) and signs in */
export async function createUser(role: 'student' | 'tutor' | 'admin', name = `Test ${role}`): Promise<TestUser> {
  const email = `it-${run}-${++n}-${role}@it.example.com`;
  const password = `pw-${run}-${n}-long-enough`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role, timezone: 'UTC' },
  });
  if (error) throw error;
  created.push(data.user.id);
  if (role === 'admin') await admin().from('profiles').update({ role: 'admin' }).eq('id', data.user.id);

  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

/** Makes a tutor bookable (as if Stripe enabled transfers) with weekday hours 08:00–20:00 UTC */
export async function makeListed(tutorId: string) {
  const db = admin();
  await db
    .from('tutors')
    .update({
      headline: 'Integration test tutor',
      subjects: ['Testing'],
      transfers_enabled: true,
      hourly_rate_cents: 4000,
      lesson_minutes: 60,
    })
    .eq('profile_id', tutorId);
  await db.from('availability_rules').delete().eq('tutor_id', tutorId);
  await db
    .from('availability_rules')
    .insert(
      [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ tutor_id: tutorId, weekday, start_minute: 480, end_minute: 1200 })),
    );
}

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];

/** Inserts a booking directly (the way the server does, with the service role) */
export async function insertBooking(values: Partial<BookingInsert> & Pick<BookingInsert, 'student_id' | 'tutor_id'>) {
  const start = values.starts_at ? new Date(values.starts_at) : new Date(Date.now() + 3 * 86_400_000);
  return admin()
    .from('bookings')
    .insert({
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 3_600_000).toISOString(),
      price_cents: 4000,
      platform_fee_cents: 600,
      ...values,
    })
    .select()
    .single();
}

/** Deletes every user created by this test run (their profiles, tutors and bookings cascade) */
export async function cleanup() {
  const db = admin();
  for (const id of created.splice(0)) {
    await db.from('bookings').delete().or(`student_id.eq.${id},tutor_id.eq.${id}`);
    await db.auth.admin.deleteUser(id);
  }
}

/** A whole-hour UTC time some days ahead, so tests don't collide with each other */
export function slot(daysAhead: number, utcHour: number): Date {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}
