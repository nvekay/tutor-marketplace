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
        <div className="rounded-3xl border border-dashed border-stone-300 px-4 py-12 text-center dark:border-stone-700">
          <CalendarX className="mx-auto size-6 text-stone-400" aria-hidden />
          <p className="mt-2 font-medium">No free times this week</p>
          <p className="text-sm text-stone-500">Try the next week.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7 md:gap-2">
          {days.map((day) => {
            const { weekday, day: date } = dayLabel(day.date);
            return (
              <div key={day.date} className="flex gap-3 md:flex-col md:gap-1.5">
                <p className="w-16 shrink-0 pt-1.5 text-sm md:w-auto md:pt-0 md:text-center">
                  <span className="font-medium">{weekday}</span> <span className="text-stone-500 md:block">{date}</span>
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
                        className={`rounded-full border px-3 py-1.5 text-sm tabular-nums transition-colors ${
                          active
                            ? 'border-accent bg-accent font-medium text-white'
                            : 'border-stone-300 bg-white hover:border-accent hover:bg-accent-soft dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800'
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
        <div className="animate-fade-in sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-card-hover dark:border-stone-700 dark:bg-stone-900">
          <div className="text-sm">
            <p className="font-display text-lg font-semibold">
              {lessonMinutes}-minute lesson with {tutorName}
            </p>
            <p className="text-stone-600 dark:text-stone-400">
              {selectedLabel} · <span className="font-medium text-stone-900 dark:text-stone-100">{priceLabel}</span>
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
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
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
