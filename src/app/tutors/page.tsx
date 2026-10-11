import { SearchX, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatUsd, listSubjects, searchTutors, type TutorSearch } from '@/lib/tutors';
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Find a tutor</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Pay when you book. Your money is held until the lesson takes place, and refunded if it doesn’t.
      </p>

      <TutorFilters subjects={subjects} current={search} />

      {tutors.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
          <SearchX className="mx-auto size-6 text-slate-400" aria-hidden />
          <p className="mt-2 font-medium">No tutors match these filters</p>
          <Link href="/tutors" className="mt-1 inline-block text-sm text-accent hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tutors/${t.id}`}
                className="group flex h-full flex-col rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-sm dark:border-slate-800"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent dark:bg-slate-800 dark:text-teal-300"
                    aria-hidden
                  >
                    {initials(t.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium group-hover:text-accent">{t.fullName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      {t.ratingAvg ? (
                        <>
                          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                          {t.ratingAvg.toFixed(1)} · {t.ratingCount} reviews
                        </>
                      ) : (
                        'New tutor'
                      )}
                    </p>
                  </div>
                  <p className="text-right text-sm font-semibold whitespace-nowrap">
                    {formatUsd(t.hourlyRateCents)}
                    <span className="block text-xs font-normal text-slate-500">per hour</span>
                  </p>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{t.headline}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {t.subjects.map((s) => (
                    <li key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                      {s}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
