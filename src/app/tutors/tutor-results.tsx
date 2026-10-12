'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AvailabilityGrid } from '@/components/availability-grid';
import { Avatar } from '@/components/avatar';
import { TutorCard } from '@/components/tutor-card';
import type { TutorListItem } from '@/lib/tutors';

/** Results list with a sticky side panel showing the hovered tutor's week, as on italki */
export function TutorResults({ tutors, timezone }: { tutors: TutorListItem[]; timezone: string }) {
  const [activeId, setActiveId] = useState(tutors[0]?.id);
  const active = tutors.find((t) => t.id === activeId) ?? tutors[0];

  return (
    <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
      <ul className="flex flex-col gap-4">
        {tutors.map((t) => (
          <li key={t.id} onMouseEnter={() => setActiveId(t.id)} onFocus={() => setActiveId(t.id)}>
            <TutorCard tutor={t} active={t.id === active?.id} />
          </li>
        ))}
      </ul>

      {active && (
        <aside
          className="sticky top-20 hidden rounded-lg border-2 border-stone-200 bg-white p-5 lg:block dark:border-stone-800 dark:bg-stone-900"
          aria-label={`${active.fullName}’s weekly availability`}
        >
          <div className="flex items-center gap-3">
            <Avatar name={active.fullName} src={active.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-bold">{active.fullName}</p>
              <p className="text-xs text-stone-500">Usually available</p>
            </div>
          </div>
          <div className="mt-4">
            <AvailabilityGrid heatmap={active.heatmap} timezone={timezone} />
          </div>
          <Link
            href={`/tutors/${active.id}#schedule`}
            className="mt-4 flex items-center justify-center gap-1 rounded-lg border-2 border-stone-900 px-4 py-2 text-sm font-semibold transition-colors hover:bg-stone-100 dark:border-stone-200 dark:hover:bg-stone-800"
          >
            View full schedule <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      )}
    </div>
  );
}
