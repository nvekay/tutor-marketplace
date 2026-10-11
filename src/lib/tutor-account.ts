import 'server-only';
import type { Viewer } from './auth';
import type { DateException, WeeklyRule } from './availability/slots';
import { createSupabaseServerClient } from './db/server';

export interface MyTutorProfile {
  id: string;
  fullName: string;
  timezone: string;
  isDemo: boolean;
  headline: string;
  bio: string;
  subjects: string[];
  hourlyRateCents: number;
  lessonMinutes: number;
  stripeAccountId: string | null;
  transfersEnabled: boolean;
  payoutsEnabled: boolean;
  stripeRequirements: string[];
  listed: boolean;
  rules: WeeklyRule[];
  exceptions: DateException[];
}

/** The signed-in tutor's own profile, schedule and payout status (read through row level security) */
export async function getMyTutorProfile(viewer: Viewer): Promise<MyTutorProfile> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tutor, rules, exceptions] = await Promise.all([
    supabase.from('tutors').select('*').eq('profile_id', viewer.id).single(),
    supabase
      .from('availability_rules')
      .select('weekday, start_minute, end_minute')
      .eq('tutor_id', viewer.id)
      .order('weekday')
      .order('start_minute'),
    supabase
      .from('availability_exceptions')
      .select('date, start_minute, end_minute')
      .eq('tutor_id', viewer.id)
      .gte('date', today)
      .order('date'),
  ]);
  if (tutor.error) throw new Error(`Could not load your tutor profile: ${tutor.error.message}`);
  const t = tutor.data;

  return {
    id: viewer.id,
    fullName: viewer.fullName,
    timezone: viewer.timezone,
    isDemo: viewer.isDemo,
    headline: t.headline,
    bio: t.bio,
    subjects: t.subjects,
    hourlyRateCents: t.hourly_rate_cents,
    lessonMinutes: t.lesson_minutes,
    stripeAccountId: t.stripe_account_id,
    transfersEnabled: t.transfers_enabled,
    payoutsEnabled: t.payouts_enabled,
    stripeRequirements: t.stripe_requirements,
    listed: Boolean(t.listed),
    rules: (rules.data ?? []).map((r) => ({
      weekday: r.weekday,
      startMinute: r.start_minute,
      endMinute: r.end_minute,
    })),
    exceptions: (exceptions.data ?? []).map((e) => ({
      date: e.date,
      startMinute: e.start_minute,
      endMinute: e.end_minute,
    })),
  };
}

/** Onboarding steps shown on the tutor dashboard */
export function onboardingSteps(t: MyTutorProfile) {
  return [
    { key: 'profile', label: 'Profile', done: t.headline !== '' && t.subjects.length > 0, href: '/tutor/profile' },
    { key: 'schedule', label: 'Weekly hours', done: t.rules.length > 0, href: '/tutor/schedule' },
    { key: 'payouts', label: 'Payouts with Stripe', done: t.transfersEnabled, href: '/tutor#payouts' },
  ] as const;
}
