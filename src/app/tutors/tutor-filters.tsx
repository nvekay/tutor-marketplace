'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { TutorSearch } from '@/lib/tutors';

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition hover:border-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900';

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
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <select
        aria-label="Subject"
        value={current.subject ?? ''}
        onChange={(e) => update('subject', e.target.value)}
        className={selectClass}
      >
        <option value="">All subjects</option>
        {subjects.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
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
  );
}
