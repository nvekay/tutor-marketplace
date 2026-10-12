'use client';

import { CalendarOff, Clock, X } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormMessage, inputClass } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { minuteLabel, type DateException } from '@/lib/availability/slots';
import { addDateException, removeDateException } from '../actions';
import { TimeSelect } from './time-select';

const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export function DateExceptions({ exceptions, timezone }: { exceptions: DateException[]; timezone: string }) {
  const [state, action, pending] = useActionState(addDateException, {});
  const [kind, setKind] = useState<'off' | 'hours'>('off');
  const [start, setStart] = useState(600);
  const [end, setEnd] = useState(840);
  const [removing, startRemoving] = useTransition();
  const [removingDate, setRemovingDate] = useState<string>();
  const toast = useToast();

  const remove = (date: string) => {
    setRemovingDate(date);
    startRemoving(async () => {
      const result = await removeDateException(date);
      if (result.error) toast.error(result.error);
      setRemovingDate(undefined);
    });
  };

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <form
        action={action}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white shadow-card p-4 dark:border-stone-800 dark:bg-stone-900"
      >
        <Field label={`Date (${timezone})`}>
          <input name="date" type="date" required className={inputClass} />
        </Field>
        <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Type">
          {(['off', 'hours'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="accent-[var(--color-accent)]"
              />
              {k === 'off' ? 'Day off' : 'Special hours'}
            </label>
          ))}
        </div>
        {kind === 'hours' && (
          <div className="flex items-center gap-2">
            <TimeSelect
              label="From"
              value={start}
              max={1410}
              onChange={(m) => {
                setStart(m);
                setEnd(Math.max(end, m + 30));
              }}
            />
            <span className="text-stone-400">–</span>
            <TimeSelect label="Until" value={end} min={start + 30} onChange={setEnd} />
            <input type="hidden" name="start" value={minuteLabel(start)} />
            <input type="hidden" name="end" value={minuteLabel(end)} />
          </div>
        )}
        <FormMessage error={state.error} ok={state.ok} />
        <div>
          <Button type="submit" loading={pending}>
            Add
          </Button>
        </div>
      </form>

      {exceptions.length === 0 ? (
        <p className="text-sm text-stone-500 md:pt-4">No upcoming days off or special hours.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exceptions.map((e) => (
            <li
              key={e.date}
              className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-800"
            >
              {e.startMinute === null ? (
                <CalendarOff className="size-4 shrink-0 text-stone-400" aria-hidden />
              ) : (
                <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
              )}
              <span className="flex-1">
                <span className="font-medium">{dateLabel(e.date)}</span>
                <span className="text-stone-500">
                  {' · '}
                  {e.startMinute === null ? 'Day off' : `${minuteLabel(e.startMinute)}–${minuteLabel(e.endMinute!)}`}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${dateLabel(e.date)}`}
                loading={removing && removingDate === e.date}
                onClick={() => remove(e.date)}
              >
                {!(removing && removingDate === e.date) && <X className="size-4" aria-hidden />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
