import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Link
        href="/tutors"
        className="inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-800 dark:hover:text-stone-200"
      >
        <ChevronLeft className="size-4" aria-hidden /> All tutors
      </Link>
      {checkout === 'cancelled' && (
        <p role="status" className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800">
          Payment cancelled, nothing was charged. The time is free again if you want to pick it once more.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="tutor-name">
          <div className="flex items-start gap-5">
            <Avatar name={tutor.fullName} size="lg" />
            <div className="min-w-0">
              <h1 id="tutor-name" className="text-4xl leading-tight font-semibold">
                {tutor.fullName}
              </h1>
              <p className="mt-1 font-display text-lg text-stone-700 italic dark:text-stone-300">{tutor.headline}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                {tutor.ratingAvg ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-amber-500 text-amber-500" aria-hidden />
                    {tutor.ratingAvg.toFixed(1)} · {tutor.ratingCount} reviews
                  </span>
                ) : (
                  <span>New tutor</span>
                )}
                <span>
                  {formatUsd(tutor.hourlyRateCents)}/hour · {tutor.lessonMinutes}-minute lessons
                </span>
              </p>
            </div>
          </div>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {tutor.subjects.map((s) => (
              <li
                key={s}
                className="rounded-full border border-stone-300 px-3 py-0.5 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300"
              >
                {s}
              </li>
            ))}
          </ul>
          {tutor.bio && (
            <p className="mt-5 max-w-prose whitespace-pre-line text-stone-700 dark:text-stone-300">{tutor.bio}</p>
          )}

          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-semibold">Pick a time</h2>
              <div className="flex items-center gap-1">
                <WeekLink id={tutor.id} week={weekIndex - 1} disabled={weekIndex === 0} label="Previous week">
                  <ChevronLeft className="size-4" aria-hidden />
                </WeekLink>
                <span className="min-w-36 text-center text-sm tabular-nums">{rangeLabel}</span>
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
          </div>
        </section>

        <aside aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="text-2xl font-semibold">
            Reviews
          </h2>
          {tutor.reviews.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No reviews yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {tutor.reviews.map((r, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-stone-200/80 bg-white p-4 text-sm shadow-card dark:border-stone-800 dark:bg-stone-900"
                >
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.author}</span>
                    <span className="flex" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star
                          key={k}
                          className={`size-3.5 ${k < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-600'}`}
                          aria-hidden
                        />
                      ))}
                    </span>
                  </p>
                  {r.comment && <p className="mt-1 text-stone-700 dark:text-stone-300">{r.comment}</p>}
                  <p className="mt-1 text-xs text-stone-500">{shortDate(r.createdAt.slice(0, 10))}</p>
                </li>
              ))}
            </ul>
          )}
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
    'grid size-8 place-items-center rounded-md border border-stone-200 transition-colors dark:border-stone-800';
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
      className={`${className} hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900`}
    >
      {children}
    </Link>
  );
}

/** "2027-01-04" → "Jan 4" */
const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
