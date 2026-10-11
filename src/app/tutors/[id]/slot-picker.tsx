'use client';

import { CalendarX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface PickerDay {
  /** yyyy-MM-dd in the viewer's time zone */
  date: string;
  slots: { start: string; label: string }[];
}

interface Props {
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

export function SlotPicker({ days, timezone, tutorName, priceLabel, lessonMinutes, viewerRole }: Props) {
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
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
          <CalendarX className="mx-auto size-6 text-slate-400" aria-hidden />
          <p className="mt-2 font-medium">No free times this week</p>
          <p className="text-sm text-slate-500">Try the next week.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7 md:gap-2">
          {days.map((day) => {
            const { weekday, day: date } = dayLabel(day.date);
            return (
              <div key={day.date} className="flex gap-3 md:flex-col md:gap-1.5">
                <p className="w-16 shrink-0 pt-1.5 text-sm md:w-auto md:pt-0 md:text-center">
                  <span className="font-medium">{weekday}</span> <span className="text-slate-500 md:block">{date}</span>
                </p>
                <div className="flex flex-1 flex-wrap gap-1.5 md:flex-col">
                  {day.slots.length === 0 && <span className="pt-1.5 text-sm text-slate-400 md:text-center">—</span>}
                  {day.slots.map((slot) => {
                    const active = selected === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelected(active ? null : slot.start)}
                        className={`rounded-md border px-2.5 py-1.5 text-sm tabular-nums transition-colors ${
                          active
                            ? 'border-accent bg-accent font-medium text-white'
                            : 'border-slate-200 hover:border-accent hover:bg-accent-soft dark:border-slate-700 dark:hover:bg-slate-800'
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
        <div className="animate-fade-in sticky bottom-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm">
            <p className="font-medium">
              {lessonMinutes}-minute lesson with {tutorName}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {selectedLabel} · <span className="font-medium text-slate-900 dark:text-slate-100">{priceLabel}</span>
            </p>
          </div>
          <BookAction role={viewerRole} />
        </div>
      )}
    </div>
  );
}

function BookAction({ role }: { role: Props['viewerRole'] }) {
  if (role === null)
    return (
      <Link
        href="/login"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
      >
        Sign in to book
      </Link>
    );
  if (role !== 'student')
    return (
      <p className="text-sm text-slate-500">
        {role === 'self' ? 'This is your public page' : 'Only students can book lessons'}
      </p>
    );
  return (
    <Button variant="primary" disabled title="Checkout is added in the next step">
      Book and pay
    </Button>
  );
}
