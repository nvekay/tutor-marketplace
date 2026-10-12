import { ChevronLeft, ChevronRight, GraduationCap, ShieldCheck, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { findSlots } from '@/lib/availability/service';
import { addDays, BOOKING_HORIZON_DAYS, localDateKey, startOfLocalDay } from '@/lib/availability/slots';
import { getViewer } from '@/lib/auth';
import { viewerTimezone } from '@/lib/timezone';
import { lessonPriceCents } from '@/lib/bookings/pricing';
import { formatUsd, getTutorProfile } from '@/lib/tutors';
import { SlotPicker, type PickerDay } from './slot-picker';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string; checkout?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tutor = await getTutorProfile((await params).id);
  return { title: tutor ? `${tutor.fullName} · Tutor Market` : 'Tutor not found · Tutor Market' };
}

const MAX_WEEK = Math.floor(BOOKING_HORIZON_DAYS / 7);

export default async function TutorPage({ params, searchParams }: Props) {
  const [{ id }, { week, checkout }] = await Promise.all([params, searchParams]);
  const tutor = await getTutorProfile(id);
  if (!tutor) notFound();
  const [viewer, timezone] = await Promise.all([getViewer(), viewerTimezone()]);

  // The week is made of the viewer's calendar days, so "Monday 10:00" means their Monday
  const weekIndex = Math.min(Math.max(Number.parseInt(week ?? '0', 10) || 0, 0), MAX_WEEK);
  const firstDate = addDays(localDateKey(new Date(), timezone), weekIndex * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(firstDate, i));
  const slots = await findSlots(tutor.id, {
    from: startOfLocalDay(firstDate, timezone),
    to: startOfLocalDay(addDays(firstDate, 7), timezone),
  });

  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  });
  const days: PickerDay[] = dates.map((date) => ({
    date,
    slots: slots
      .filter((s) => localDateKey(s.start, timezone) === date)
      .map((s) => ({ start: s.start.toISOString(), label: time.format(s.start) })),
  }));
  const price = lessonPriceCents(tutor.hourlyRateCents, tutor.lessonMinutes);
  const rangeLabel = `${shortDate(dates[0])} – ${shortDate(dates[6])}`;

  const average = tutor.ratingAvg;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Link
        href="/tutors"
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ChevronLeft className="size-4" aria-hidden /> All tutors
      </Link>
      {checkout === 'cancelled' && (
        <p role="status" className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
          Payment cancelled, nothing was charged. The time is free again if you want to pick it once more.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <section aria-labelledby="tutor-name" className="flex items-start gap-5">
            <Avatar name={tutor.fullName} src={tutor.avatarUrl} size="lg" />
            <div className="min-w-0">
              <h1 id="tutor-name" className="text-4xl leading-tight">
                {tutor.fullName}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                <GraduationCap className="size-4 shrink-0" aria-hidden />
                {tutor.subjects.join(', ')} tutor
              </p>
              <p className="mt-3 text-lg font-semibold">{tutor.headline}</p>
            </div>
          </section>

          {tutor.bio && (
            <section aria-labelledby="about" className="mt-10">
              <h2 id="about" className="text-2xl">
                About me
              </h2>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed whitespace-pre-line text-stone-700 dark:text-stone-300">
                {tutor.bio}
              </p>
            </section>
          )}

          <section id="schedule" aria-labelledby="schedule-title" className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="schedule-title" className="text-2xl">
                Schedule
              </h2>
              <div className="flex items-center gap-1">
                <WeekLink id={tutor.id} week={weekIndex - 1} disabled={weekIndex === 0} label="Previous week">
                  <ChevronLeft className="size-4" aria-hidden />
                </WeekLink>
                <span className="min-w-36 text-center text-sm font-semibold tabular-nums">{rangeLabel}</span>
                <WeekLink id={tutor.id} week={weekIndex + 1} disabled={weekIndex === MAX_WEEK} label="Next week">
                  <ChevronRight className="size-4" aria-hidden />
                </WeekLink>
              </div>
            </div>
            <p className="mt-1 text-sm text-stone-500">Times in your time zone: {timezone}</p>
            <SlotPicker
              key={`${weekIndex}-${timezone}`}
              tutorId={tutor.id}
              days={days}
              timezone={timezone}
              tutorName={tutor.fullName}
              priceLabel={formatUsd(price)}
              lessonMinutes={tutor.lessonMinutes}
              viewerRole={viewer?.id === tutor.id ? 'self' : (viewer?.role ?? null)}
            />
          </section>

          <section aria-labelledby="reviews-title" className="mt-12">
            <h2 id="reviews-title" className="text-2xl">
              What my students say
            </h2>
            {average ? (
              <p className="mt-3 flex items-end gap-2">
                <span className="text-5xl leading-none font-bold tracking-tight">{average.toFixed(1)}</span>
                <Star className="mb-1 size-7 fill-current" aria-hidden />
                <span className="mb-1 text-sm text-stone-500">based on {tutor.ratingCount} reviews</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No reviews yet.</p>
            )}
            {tutor.reviews.length > 0 && (
              <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {tutor.reviews.map((r, i) => (
                  <li key={i}>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author} size="sm" />
                      <div>
                        <p className="font-semibold">{r.author}</p>
                        <p className="text-xs text-stone-500">{longDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <p className="mt-2 flex" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star
                          key={k}
                          className={`size-4 ${k < r.rating ? 'fill-current' : 'text-stone-300 dark:text-stone-600'}`}
                          aria-hidden
                        />
                      ))}
                    </p>
                    {r.comment && <p className="mt-1.5 text-[15px] text-stone-700 dark:text-stone-300">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="top-20 rounded-lg border-2 border-stone-200 bg-white p-5 lg:sticky dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-end justify-between gap-4">
            <p>
              <span className="text-3xl font-bold">{formatUsd(price)}</span>
              <span className="block text-sm text-stone-500">{tutor.lessonMinutes}-min lesson</span>
            </p>
            {average && (
              <p className="text-right">
                <span className="inline-flex items-center gap-1 text-xl font-bold">
                  {average.toFixed(1)} <Star className="size-4 fill-current" aria-hidden />
                </span>
                <span className="block text-sm text-stone-500">{tutor.ratingCount} reviews</span>
              </p>
            )}
          </div>
          <a
            href="#schedule"
            className="mt-5 block rounded-lg bg-stone-900 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
          >
            Book lesson
          </a>
          <div className="mt-5 flex gap-3 border-t border-stone-200 pt-5 text-sm dark:border-stone-800">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent dark:text-accent-ink" aria-hidden />
            <p className="text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-900 dark:text-stone-100">Paid after the lesson.</span> You pay
              when you book; we hold the money until the lesson has happened. Cancel 24 hours ahead for a full refund.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function WeekLink({
  id,
  week,
  disabled,
  label,
  children,
}: {
  id: string;
  week: number;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    'grid size-9 place-items-center rounded-lg border-2 border-stone-200 transition-colors dark:border-stone-700';
  if (disabled)
    return (
      <span className={`${className} opacity-40`} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  return (
    <Link
      href={week === 0 ? `/tutors/${id}` : `/tutors/${id}?week=${week}`}
      scroll={false}
      aria-label={label}
      className={`${className} hover:border-stone-900 dark:hover:border-stone-200`}
    >
      {children}
    </Link>
  );
}

/** "2027-01-04" → "Jan 4" */
const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "2026-10-03T…" → "October 3, 2026" */
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
