import { GraduationCap, Star } from 'lucide-react';
import Link from 'next/link';
import { formatUsd } from '@/lib/format';
import type { TutorListItem } from '@/lib/tutors';
import { Avatar } from './avatar';

/** A tutor in the search results: photo, what they teach, price, rating and the two actions */
export function TutorCard({ tutor: t, active = false }: { tutor: TutorListItem; active?: boolean }) {
  return (
    <article
      data-tutor-card
      className={`grid gap-5 rounded-lg border-2 bg-white p-5 transition-colors sm:grid-cols-[112px_1fr] md:grid-cols-[112px_1fr_200px] dark:bg-stone-900 ${
        active ? 'border-stone-900 dark:border-stone-200' : 'border-stone-200 dark:border-stone-800'
      }`}
    >
      <Link href={`/tutors/${t.id}`} tabIndex={-1} aria-hidden className="w-fit">
        <Avatar name={t.fullName} src={t.avatarUrl} size="lg" />
      </Link>

      <div className="min-w-0">
        <h2 className="text-xl">
          <Link href={`/tutors/${t.id}`} className="hover:underline">
            {t.fullName}
          </Link>
        </h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
          <GraduationCap className="size-4 shrink-0" aria-hidden />
          {t.subjects.join(', ')}
        </p>
        <p className="mt-3 font-semibold">{t.headline}</p>
        <p className="mt-1 line-clamp-2 text-[15px] text-stone-600 dark:text-stone-400">{t.bio}</p>
        <Link
          href={`/tutors/${t.id}`}
          className="mt-1 inline-block text-sm font-semibold underline underline-offset-2 hover:text-accent"
        >
          Learn more
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 md:col-span-1">
        <div className="flex items-end justify-between gap-4 md:block">
          <p>
            <span className="text-2xl font-bold">{formatUsd(t.hourlyRateCents)}</span>
            <span className="block text-sm text-stone-500">{t.lessonMinutes}-min lesson</span>
          </p>
          <p className="md:mt-3">
            {t.ratingAvg ? (
              <>
                <span className="inline-flex items-center gap-1 text-lg font-bold">
                  {t.ratingAvg.toFixed(1)} <Star className="size-4 fill-current" aria-hidden />
                </span>
                <span className="block text-sm text-stone-500">{t.ratingCount} reviews</span>
              </>
            ) : (
              <span className="text-sm font-semibold">New tutor</span>
            )}
          </p>
        </div>
        <div className="mt-auto grid gap-2">
          <Link
            href={`/tutors/${t.id}#schedule`}
            className="rounded-lg bg-stone-900 px-4 py-2.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
          >
            Book lesson
          </Link>
          <Link
            href={`/tutors/${t.id}`}
            className="rounded-lg border-2 border-stone-900 px-4 py-2 text-center text-[15px] font-semibold transition-colors hover:bg-stone-100 dark:border-stone-200 dark:hover:bg-stone-800"
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
