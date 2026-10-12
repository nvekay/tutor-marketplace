import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { AvailabilityFilter } from '@/lib/availability/heatmap';
import { viewerTimezone } from '@/lib/timezone';
import { listSubjects, searchTutors, type TutorSearch } from '@/lib/tutors';
import { TutorFilters } from './tutor-filters';
import { TutorResults } from './tutor-results';

export const metadata: Metadata = { title: 'Find a tutor · Tutor Market' };

const SORTS = ['rating', 'price_asc', 'price_desc'] as const;
const AVAILABILITY: AvailabilityFilter[] = ['weekdays', 'weekends', 'mornings', 'afternoons', 'evenings'];

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; max?: string; sort?: string; q?: string; available?: string }>;
}) {
  const params = await searchParams;
  const search: TutorSearch = {
    subject: params.subject || undefined,
    maxPriceUsd: Number(params.max) > 0 ? Number(params.max) : undefined,
    sort: SORTS.find((s) => s === params.sort) ?? 'rating',
    q: params.q?.slice(0, 60) || undefined,
    available: AVAILABILITY.find((a) => a === params.available),
  };
  const timezone = await viewerTimezone();
  const [tutors, subjects] = await Promise.all([searchTutors(search, timezone), listSubjects()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">
        {search.subject ? `${search.subject} tutors` : 'Online tutors'} for private lessons
      </h1>
      <p className="mt-2 max-w-3xl text-stone-600 dark:text-stone-400">
        Book a lesson and pay upfront. The money is held until the lesson has taken place, then the tutor is paid. If it
        doesn’t happen, you get it back.
      </p>

      <TutorFilters subjects={subjects} current={search} />

      <h2 className="mt-8 text-xl">
        {tutors.length} {tutors.length === 1 ? 'tutor' : 'tutors'} available
      </h2>

      {tutors.length === 0 ? (
        <div className="mt-4 rounded-lg border-2 border-dashed border-stone-200 px-4 py-14 text-center dark:border-stone-700">
          <SearchX className="mx-auto size-6 text-stone-400" aria-hidden />
          <p className="mt-2 font-semibold">No tutors match these filters</p>
          <Link href="/tutors" className="mt-1 inline-block text-sm font-semibold underline underline-offset-2">
            Clear filters
          </Link>
        </div>
      ) : (
        <TutorResults tutors={tutors} timezone={timezone} />
      )}
    </main>
  );
}
