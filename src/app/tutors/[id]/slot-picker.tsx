'use client';

import { CalendarX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { bookLesson } from './actions';

export interface PickerDay {
  /** yyyy-MM-dd in the viewer's time zone */
  date: string;
  slots: { start: string; label: string }[];
}

interface Props {
  tutorId: string;
  days: PickerDay[];
  timezone: string;
  tutorName: string;
  priceLabel: string;
  lessonMinutes: number;
  viewerRole: 'student' | 'tutor' | 'admin' | 'self' | null;
}

const dayLabel = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  };
};

export function SlotPicker({ tutorId, days, timezone, tutorName, priceLabel, lessonMinutes, viewerRole }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const empty = days.every((d) => d.slots.length === 0);

  const selectedLabel = selected
    ? new Date(selected).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
      })
    : null;

  return (
    <div className="mt-3">
      {empty ? (
        <div className="rounded-lg border-2 border-dashed border-stone-200 px-4 py-12 text-center dark:border-stone-700">
          <CalendarX className="mx-auto size-6 text-stone-400" aria-hidden />
          <p className="mt-2 font-semibold">No free times this week</p>
          <p className="text-sm text-stone-500">Try the next week.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7 md:gap-2">
          {days.map((day) => {
            const { weekday, day: date } = dayLabel(day.date);
            return (
              <div key={day.date} className="flex gap-3 md:flex-col md:gap-1.5">
                <p className="w-16 shrink-0 pt-1.5 text-sm md:w-auto md:pt-0 md:text-center">
                  <span className="font-bold">{weekday}</span> <span className="text-stone-500 md:block">{date}</span>
                </p>
                <div className="flex flex-1 flex-wrap gap-1.5 md:flex-col">
                  {day.slots.length === 0 && <span className="pt-1.5 text-sm text-stone-400 md:text-center">—</span>}
                  {day.slots.map((slot) => {
                    const active = selected === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelected(active ? null : slot.start)}
                        className={`rounded-md border-2 px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
                          active
                            ? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
                            : 'border-stone-200 bg-white hover:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-200'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="animate-fade-in sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-stone-900 bg-white p-5 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <div className="text-sm">
            <p className="text-lg font-bold">
              {lessonMinutes}-minute lesson with {tutorName}
            </p>
            <p className="text-stone-600 dark:text-stone-400">
              {selectedLabel} · <span className="font-medium text-stone-900 dark:text-stone-100">{priceLabel}</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Test mode: pay with{' '}
              <span className="font-mono text-stone-700 dark:text-stone-300">4242 4242 4242 4242</span>, any future date
              and CVC
            </p>
          </div>
          <BookAction role={viewerRole} tutorId={tutorId} startsAt={selected} onUnavailable={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

function BookAction({
  role,
  tutorId,
  startsAt,
  onUnavailable,
}: {
  role: Props['viewerRole'];
  tutorId: string;
  startsAt: string;
  onUnavailable: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  if (role === null)
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="rounded-lg bg-stone-900 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900"
      >
        Sign in to book
      </Link>
    );
  if (role !== 'student')
    return (
      <p className="text-sm text-stone-500">
        {role === 'self' ? 'This is your public page' : 'Only students can book lessons'}
      </p>
    );
  return (
    <Button
      variant="primary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          // On success the action redirects to Stripe Checkout
          const result = await bookLesson(tutorId, startsAt);
          if (result?.error) {
            toast.error(result.error);
            onUnavailable();
            router.refresh();
          }
        })
      }
    >
      {pending ? 'Opening checkout…' : 'Book and pay'}
    </Button>
  );
}
