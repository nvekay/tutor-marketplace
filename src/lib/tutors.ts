import 'server-only';
import { matchesAvailability, weeklyHeatmap, type AvailabilityFilter, type Heatmap } from './availability/heatmap';
import type { WeeklyRule } from './availability/slots';
import { createSupabaseAdminClient } from './db/admin';
import { createSupabaseServerClient } from './db/server';

export interface TutorCard {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  headline: string;
  bio: string;
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
  /** Part of the name, case-insensitive */
  q?: string;
  available?: AvailabilityFilter;
}

export interface TutorListItem extends TutorCard {
  /** Weekly free time in the viewer's time zone */
  heatmap: Heatmap;
}

/**
 * Listed tutors for the catalogue. Runs as the visitor, so row level security decides
 * what is visible: only tutors who can be paid (listed) and their public profile.
 */
export async function searchTutors(
  { subject, maxPriceUsd, sort = 'rating', q, available }: TutorSearch = {},
  viewerTimezone = 'UTC',
): Promise<TutorListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tutors')
    .select(
      'profile_id, headline, bio, subjects, hourly_rate_cents, lesson_minutes, rating_avg, rating_count, profiles(full_name, timezone, avatar_url)',
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

  // Weekly hours are public; one query for every tutor on the page
  const { data: rules } = await supabase
    .from('availability_rules')
    .select('tutor_id, weekday, start_minute, end_minute')
    .in(
      'tutor_id',
      data.map((t) => t.profile_id),
    );
  const rulesOf = (id: string): WeeklyRule[] =>
    (rules ?? [])
      .filter((r) => r.tutor_id === id)
      .map((r) => ({ weekday: r.weekday, startMinute: r.start_minute, endMinute: r.end_minute }));

  const needle = q?.trim().toLowerCase();
  return data
    .map((t) => ({
      id: t.profile_id,
      fullName: t.profiles?.full_name ?? 'Tutor',
      avatarUrl: t.profiles?.avatar_url ?? null,
      timezone: t.profiles?.timezone ?? 'UTC',
      headline: t.headline,
      bio: t.bio,
      subjects: t.subjects,
      hourlyRateCents: t.hourly_rate_cents,
      lessonMinutes: t.lesson_minutes,
      ratingAvg: t.rating_avg === null ? null : Number(t.rating_avg),
      ratingCount: t.rating_count,
      heatmap: weeklyHeatmap(rulesOf(t.profile_id), t.profiles?.timezone ?? 'UTC', viewerTimezone),
    }))
    .filter((t) => !needle || t.fullName.toLowerCase().includes(needle))
    .filter((t) => !available || matchesAvailability(t.heatmap, available));
}

/** All subjects taught by listed tutors, for the filter */
export async function listSubjects(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('subjects').eq('listed', true);
  return [...new Set((data ?? []).flatMap((t) => t.subjects))].sort();
}

export { formatUsd } from './format';

export interface TutorProfile extends TutorCard {
  reviews: { rating: number; comment: string; author: string; createdAt: string }[];
}

/** Public tutor page. Visible when listed (or to the tutor themselves); reviewers are shown by first name. */
export async function getTutorProfile(id: string): Promise<TutorProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data: t } = await supabase
    .from('tutors')
    .select(
      'profile_id, headline, bio, subjects, hourly_rate_cents, lesson_minutes, rating_avg, rating_count, profiles(full_name, timezone, avatar_url)',
    )
    .eq('profile_id', id)
    .maybeSingle();
  if (!t) return null;

  // Students' profiles are private, so their first names are read with the service role
  const { data: reviews } = await createSupabaseAdminClient()
    .from('reviews')
    .select('rating, comment, created_at, profiles!reviews_student_id_fkey(full_name)')
    .eq('tutor_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    id: t.profile_id,
    fullName: t.profiles?.full_name ?? 'Tutor',
    avatarUrl: t.profiles?.avatar_url ?? null,
    timezone: t.profiles?.timezone ?? 'UTC',
    headline: t.headline,
    bio: t.bio,
    subjects: t.subjects,
    hourlyRateCents: t.hourly_rate_cents,
    lessonMinutes: t.lesson_minutes,
    ratingAvg: t.rating_avg === null ? null : Number(t.rating_avg),
    ratingCount: t.rating_count,
    reviews: (reviews ?? []).map((r) => ({
      rating: r.rating,
      comment: r.comment,
      author: shortName(r.profiles?.full_name ?? ''),
      createdAt: r.created_at,
    })),
  };
}

/** "Liam Walker" → "Liam W." */
const shortName = (name: string) => {
  const [first, last] = name.trim().split(/\s+/);
  return first ? `${first}${last ? ` ${last[0]}.` : ''}` : 'Student';
};

export interface MarketplaceStats {
  tutors: number;
  reviews: number;
  averageRating: number | null;
  /** Subjects with the number of listed tutors teaching each, most taught first */
  subjects: { name: string; tutors: number }[];
}

/** Numbers for the home page, from listed tutors only */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('subjects, rating_avg, rating_count').eq('listed', true);
  const tutors = data ?? [];
  const reviews = tutors.reduce((sum, t) => sum + t.rating_count, 0);
  const ratingSum = tutors.reduce((sum, t) => sum + Number(t.rating_avg ?? 0) * t.rating_count, 0);
  const counts = new Map<string, number>();
  for (const t of tutors) for (const s of t.subjects) counts.set(s, (counts.get(s) ?? 0) + 1);
  return {
    tutors: tutors.length,
    reviews,
    averageRating: reviews ? ratingSum / reviews : null,
    subjects: [...counts]
      .map(([name, n]) => ({ name, tutors: n }))
      .sort((a, b) => b.tutors - a.tutors || a.name.localeCompare(b.name)),
  };
}
