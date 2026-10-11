import 'server-only';
import { createSupabaseServerClient } from './db/server';

export interface TutorCard {
  id: string;
  fullName: string;
  timezone: string;
  headline: string;
  subjects: string[];
  hourlyRateCents: number;
  lessonMinutes: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface TutorSearch {
  subject?: string;
  maxPriceUsd?: number;
  sort?: 'rating' | 'price_asc' | 'price_desc';
}

/**
 * Listed tutors for the catalogue. Runs as the visitor, so row level security decides
 * what is visible: only tutors who can be paid (listed) and their public profile.
 */
export async function searchTutors({ subject, maxPriceUsd, sort = 'rating' }: TutorSearch = {}): Promise<TutorCard[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tutors')
    .select(
      'profile_id, headline, subjects, hourly_rate_cents, lesson_minutes, rating_avg, rating_count, profiles(full_name, timezone)',
    )
    .eq('listed', true);

  if (subject) query = query.contains('subjects', [subject]);
  if (maxPriceUsd) query = query.lte('hourly_rate_cents', maxPriceUsd * 100);
  query =
    sort === 'price_asc'
      ? query.order('hourly_rate_cents', { ascending: true })
      : sort === 'price_desc'
        ? query.order('hourly_rate_cents', { ascending: false })
        : query
            .order('rating_avg', { ascending: false, nullsFirst: false })
            .order('rating_count', { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) throw new Error(`Could not load tutors: ${error.message}`);

  return data.map((t) => ({
    id: t.profile_id,
    fullName: t.profiles?.full_name ?? 'Tutor',
    timezone: t.profiles?.timezone ?? 'UTC',
    headline: t.headline,
    subjects: t.subjects,
    hourlyRateCents: t.hourly_rate_cents,
    lessonMinutes: t.lesson_minutes,
    ratingAvg: t.rating_avg === null ? null : Number(t.rating_avg),
    ratingCount: t.rating_count,
  }));
}

/** All subjects taught by listed tutors, for the filter */
export async function listSubjects(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('subjects').eq('listed', true);
  return [...new Set((data ?? []).flatMap((t) => t.subjects))].sort();
}

export const formatUsd = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
