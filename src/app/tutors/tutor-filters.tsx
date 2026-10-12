'use client';

import { ChevronDown, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { TutorSearch } from '@/lib/tutors';

const boxClass =
  'relative flex flex-col rounded-lg border-2 border-stone-200 bg-white px-3.5 pt-2 pb-2.5 transition-colors focus-within:border-stone-900 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-stone-200';

function SelectBox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className={boxClass}>
      <span className="text-xs text-stone-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent pr-6 text-[15px] font-semibold outline-none"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 bottom-3 size-4 text-stone-500" aria-hidden />
    </label>
  );
}

/** Filters live in the URL, so a filtered list can be shared and survives a reload */
export function TutorFilters({ subjects, current }: { subjects: string[]; current: TutorSearch }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(current.q ?? '');

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  // Name search applies after a short pause in typing
  useEffect(() => {
    if (name === (current.q ?? '')) return;
    const timer = setTimeout(() => update('q', name.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectBox
          label="I want to learn"
          value={current.subject ?? ''}
          onChange={(v) => update('subject', v)}
          options={[['', 'Any subject'], ...subjects.map((s): [string, string] => [s, s])]}
        />
        <SelectBox
          label="Price per hour"
          value={current.maxPriceUsd ? String(current.maxPriceUsd) : ''}
          onChange={(v) => update('max', v)}
          options={[
            ['', 'Any price'],
            ['25', 'Up to $25'],
            ['35', 'Up to $35'],
            ['50', 'Up to $50'],
            ['75', 'Up to $75'],
          ]}
        />
        <SelectBox
          label="I’m available"
          value={current.available ?? ''}
          onChange={(v) => update('available', v)}
          options={[
            ['', 'Any time'],
            ['weekdays', 'Weekdays'],
            ['weekends', 'Weekends'],
            ['mornings', 'Mornings (4–12)'],
            ['afternoons', 'Afternoons (12–16)'],
            ['evenings', 'Evenings (16–24)'],
          ]}
        />
        <SelectBox
          label="Sort by"
          value={current.sort ?? 'rating'}
          onChange={(v) => update('sort', v === 'rating' ? '' : v)}
          options={[
            ['rating', 'Top rated'],
            ['price_asc', 'Price: lowest first'],
            ['price_desc', 'Price: highest first'],
          ]}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Search by name</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-500"
            aria-hidden
          />
          <input
            type="search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search by name"
            className="w-full rounded-lg border-2 border-stone-200 bg-white py-2.5 pr-3 pl-10 text-[15px] outline-none transition-colors hover:border-stone-400 focus:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-200"
          />
        </label>
        {pending && <Spinner className="size-4 text-stone-500" />}
      </div>
    </div>
  );
}
