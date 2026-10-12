import { Star } from 'lucide-react';
import Link from 'next/link';
import { formatUsd, type TutorCard as TutorCardData } from '@/lib/tutors';
import { Avatar } from './avatar';

/** A tutor in search results and on the landing page */
export function TutorCard({ tutor: t }: { tutor: TutorCardData }) {
  return (
    <Link
      href={`/tutors/${t.id}`}
      className="group flex h-full flex-col rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={t.fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-semibold transition-colors group-hover:text-accent dark:group-hover:text-accent-ink">
            {t.fullName}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            {t.ratingAvg ? (
              <>
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                <span className="font-medium text-stone-700 dark:text-stone-300">{t.ratingAvg.toFixed(1)}</span>·{' '}
                {t.ratingCount} reviews
              </>
            ) : (
              <span className="rounded-full bg-amber-50 px-1.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                New tutor
              </span>
            )}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-[15px] leading-snug text-stone-700 dark:text-stone-300">{t.headline}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <ul className="flex flex-wrap gap-1.5">
          {t.subjects.slice(0, 3).map((s) => (
            <li
              key={s}
              className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:text-stone-400"
            >
              {s}
            </li>
          ))}
        </ul>
        <p className="shrink-0 text-right font-display text-xl leading-none font-semibold">
          {formatUsd(t.hourlyRateCents)}
          <span className="block pt-1 font-sans text-xs font-normal text-stone-500">per hour</span>
        </p>
      </div>
    </Link>
  );
}
