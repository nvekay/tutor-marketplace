'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { TutorSearch } from '@/lib/tutors';

const selectClass =
  'rounded-full border border-stone-300 bg-white py-2 pr-8 pl-4 text-sm outline-none transition hover:border-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-stone-700 dark:bg-stone-900';

const chipClass = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
    active
      ? 'bg-stone-900 text-paper dark:bg-stone-100'
      : 'border border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900'
  }`;

/** Filters live in the URL, so a filtered list can be shared and survives a reload */
export function TutorFilters({ subjects, current }: { subjects: string[]; current: TutorSearch }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Subject">
        <button
          type="button"
          aria-pressed={!current.subject}
          onClick={() => update('subject', '')}
          className={chipClass(!current.subject)}
        >
          All subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={current.subject === s}
            onClick={() => update('subject', current.subject === s ? '' : s)}
            className={chipClass(current.subject === s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Maximum price per hour"
          value={current.maxPriceUsd ? String(current.maxPriceUsd) : ''}
          onChange={(e) => update('max', e.target.value)}
          className={selectClass}
        >
          <option value="">Any price</option>
          {[25, 35, 50, 75].map((p) => (
            <option key={p} value={p}>
              Up to ${p}/h
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={current.sort ?? 'rating'}
          onChange={(e) => update('sort', e.target.value === 'rating' ? '' : e.target.value)}
          className={selectClass}
        >
          <option value="rating">Top rated</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        {pending && <Spinner className="size-4 text-accent" />}
      </div>
    </div>
  );
}
