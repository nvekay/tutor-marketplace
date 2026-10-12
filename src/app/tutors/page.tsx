import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TutorCard } from '@/components/tutor-card';
import { listSubjects, searchTutors, type TutorSearch } from '@/lib/tutors';
import { TutorFilters } from './tutor-filters';

export const metadata: Metadata = { title: 'Find a tutor · Tutor Market' };

const SORTS = ['rating', 'price_asc', 'price_desc'] as const;

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; max?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const search: TutorSearch = {
    subject: params.subject || undefined,
    maxPriceUsd: Number(params.max) > 0 ? Number(params.max) : undefined,
    sort: SORTS.find((s) => s === params.sort) ?? 'rating',
  };
  const [tutors, subjects] = await Promise.all([searchTutors(search), listSubjects()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <p className="text-sm font-medium text-accent dark:text-accent-ink">{tutors.length} tutors available</p>
      <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">Find your tutor</h1>
      <p className="mt-3 max-w-xl text-stone-600 dark:text-stone-400">
        Pay when you book. Your money is held until the lesson takes place, and refunded if it doesn’t.
      </p>

      <TutorFilters subjects={subjects} current={search} />

      {tutors.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-stone-300 px-4 py-14 text-center dark:border-stone-700">
          <SearchX className="mx-auto size-6 text-stone-400" aria-hidden />
          <p className="mt-2 font-medium">No tutors match these filters</p>
          <Link href="/tutors" className="mt-1 inline-block text-sm text-accent hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => (
            <li key={t.id}>
              <TutorCard tutor={t} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
