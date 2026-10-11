'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireViewer } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS, normalizeRules, SLOT_STEP_MINUTES, type WeeklyRule } from '@/lib/availability/slots';
import type { Json } from '@/lib/db/database.types';
import { createSupabaseServerClient } from '@/lib/db/server';
import { dashboardLink, ensureConnectedAccount, onboardingLink, syncConnectedAccount } from '@/lib/payments/connect';
import { paymentsConfigured } from '@/lib/payments/stripe';

export interface FormState {
  error?: string;
  ok?: string;
}

const DEMO_READ_ONLY =
  'The shared demo tutor keeps its public profile and payouts as they are. Sign up as a tutor to try the full onboarding.';

const timezones = new Set(Intl.supportedValuesOf('timeZone').concat('UTC'));

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(80),
  timezone: z.string().refine((tz) => timezones.has(tz), 'Choose a time zone from the list'),
  headline: z.string().trim().min(10, 'Headline: at least 10 characters').max(120, 'Headline: up to 120 characters'),
  bio: z.string().trim().max(2000, 'About you: up to 2000 characters'),
  subjects: z
    .string()
    // "Math, math , Algebra" → ["Math", "Algebra"]: the first spelling wins
    .transform((s) => {
      const bySpelling = new Map<string, string>();
      for (const subject of s.split(',').map((x) => x.trim().replace(/\s+/g, ' '))) {
        if (subject && !bySpelling.has(subject.toLowerCase())) bySpelling.set(subject.toLowerCase(), subject);
      }
      return [...bySpelling.values()];
    })
    .pipe(
      z
        .array(z.string().max(30, 'Each subject: up to 30 characters'))
        .min(1, 'Add at least one subject')
        .max(8, 'Up to 8 subjects'),
    ),
  hourlyRateUsd: z.coerce
    .number()
    .int('Whole dollars only')
    .min(5, 'Minimum $5 per hour')
    .max(500, 'Maximum $500 per hour'),
  lessonMinutes: z.coerce.number().refine((m) => [30, 45, 60, 90].includes(m), 'Choose a lesson length'),
});

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  if (viewer.isDemo) return { error: DEMO_READ_ONLY };
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;

  const supabase = await createSupabaseServerClient();
  const [profile, tutor] = await Promise.all([
    supabase.from('profiles').update({ full_name: p.fullName, timezone: p.timezone }).eq('id', viewer.id),
    supabase
      .from('tutors')
      .update({
        headline: p.headline,
        bio: p.bio,
        subjects: p.subjects,
        hourly_rate_cents: p.hourlyRateUsd * 100,
        lesson_minutes: p.lessonMinutes,
      })
      .eq('profile_id', viewer.id),
  ]);
  const error = profile.error ?? tutor.error;
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath('/', 'layout');
  return { ok: 'Profile saved' };
}

const rulesSchema = z
  .array(z.object({ weekday: z.number().int(), startMinute: z.number().int(), endMinute: z.number().int() }))
  .max(50, 'Too many time ranges');

export async function saveWeeklyHours(rules: WeeklyRule[]): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  const input = rulesSchema.safeParse(rules);
  if (!input.success) return { error: input.error.issues[0].message };
  const result = normalizeRules(input.data);
  if ('error' in result) return { error: result.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('replace_availability_rules', { p_rules: result.rules as unknown as Json });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath('/tutor', 'layout');
  revalidatePath(`/tutors/${viewer.id}`);
  return { ok: 'Weekly hours saved' };
}

const timeOfDay = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .transform((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));

const exceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
    kind: z.enum(['off', 'hours']),
    start: timeOfDay.optional(),
    end: timeOfDay.optional(),
  })
  .refine((e) => e.kind === 'off' || (e.start !== undefined && e.end !== undefined && e.end > e.start), {
    message: 'Special hours must end after they start',
  })
  .refine((e) => e.kind === 'off' || (e.start! % SLOT_STEP_MINUTES === 0 && e.end! % SLOT_STEP_MINUTES === 0), {
    message: 'Times must be on the hour or half hour',
  });

export async function addDateException(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  const raw = Object.fromEntries(form);
  const parsed = exceptionSchema.safeParse({ ...raw, start: raw.start || undefined, end: raw.end || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, kind, start, end } = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  const last = new Date(Date.now() + BOOKING_HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (date < today || date > last) return { error: `Choose a date within the next ${BOOKING_HORIZON_DAYS} days` };

  const supabase = await createSupabaseServerClient();
  // One entry per date: a new one replaces the old
  await supabase.from('availability_exceptions').delete().eq('tutor_id', viewer.id).eq('date', date);
  const { error } = await supabase.from('availability_exceptions').insert({
    tutor_id: viewer.id,
    date,
    start_minute: kind === 'off' ? null : start,
    end_minute: kind === 'off' ? null : end,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath('/tutor/schedule');
  revalidatePath(`/tutors/${viewer.id}`);
  return { ok: kind === 'off' ? 'Day off added' : 'Special hours added' };
}

export async function removeDateException(date: string): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('availability_exceptions').delete().eq('tutor_id', viewer.id).eq('date', date);
  if (error) return { error: `Could not remove: ${error.message}` };
  revalidatePath('/tutor/schedule');
  revalidatePath(`/tutors/${viewer.id}`);
  return { ok: 'Removed' };
}

/** Creates the Stripe account if needed and sends the tutor to Stripe-hosted onboarding */
export async function startPayoutOnboarding(): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  if (viewer.isDemo) return { error: DEMO_READ_ONLY };
  if (!paymentsConfigured()) return { error: 'Payments are not configured on this server' };

  let url: string;
  try {
    const accountId = await ensureConnectedAccount({ id: viewer.id, email: viewer.email, fullName: viewer.fullName });
    url = await onboardingLink(accountId);
  } catch (e) {
    console.error('payout onboarding failed', e);
    return { error: 'Stripe is not responding right now. Please try again in a minute.' };
  }
  redirect(url);
}

/** Opens the tutor's Stripe Express dashboard (balance, payouts, bank account) */
export async function openStripeDashboard(): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('stripe_account_id').eq('profile_id', viewer.id).single();
  if (!data?.stripe_account_id) return { error: 'Set up payouts first' };
  if (viewer.isDemo)
    return { error: 'The demo tutor’s account is managed by the platform and has no Stripe dashboard' };

  let url: string;
  try {
    url = await dashboardLink(data.stripe_account_id);
  } catch (e) {
    console.error('stripe dashboard link failed', e);
    return { error: 'Finish payout setup to open your Stripe dashboard' };
  }
  redirect(url);
}

/** Re-reads the payout status from Stripe (the webhook does this too; this is the manual fallback) */
export async function refreshPayoutStatus(): Promise<FormState> {
  const viewer = await requireViewer('tutor');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('stripe_account_id').eq('profile_id', viewer.id).single();
  if (!data?.stripe_account_id) return { error: 'Set up payouts first' };
  try {
    const status = await syncConnectedAccount(data.stripe_account_id);
    revalidatePath('/', 'layout');
    return { ok: status?.transfersEnabled ? 'Payouts are active' : 'Stripe still needs a few details from you' };
  } catch (e) {
    console.error('payout status refresh failed', e);
    return { error: 'Could not reach Stripe. Please try again.' };
  }
}
