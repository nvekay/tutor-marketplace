'use client';

import { Copy, Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { normalizeRules, WEEKDAYS, type WeeklyRule } from '@/lib/availability/slots';
import { saveWeeklyHours } from '../actions';
import { TimeSelect } from './time-select';

type Range = { startMinute: number; endMinute: number };
type Week = Range[][]; // index 0 = Monday

const toWeek = (rules: WeeklyRule[]): Week =>
  WEEKDAYS.map((_, i) =>
    rules.filter((r) => r.weekday === i + 1).map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute })),
  );

const toRules = (week: Week): WeeklyRule[] =>
  week.flatMap((ranges, i) => ranges.map((r) => ({ weekday: i + 1, ...r })));

export function WeeklyHoursEditor({ initial, lessonMinutes }: { initial: WeeklyRule[]; lessonMinutes: number }) {
  const [week, setWeek] = useState<Week>(() => toWeek(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toRules(toWeek(initial))));
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const rules = toRules(week);
  const dirty = JSON.stringify(rules) !== saved;
  const validation = normalizeRules(rules);
  const hoursPerWeek = rules.reduce((sum, r) => sum + (r.endMinute - r.startMinute), 0) / 60;

  const updateDay = (day: number, ranges: Range[]) => setWeek((w) => w.map((d, i) => (i === day ? ranges : d)));

  const addRange = (day: number) => {
    const last = week[day].at(-1);
    // Next free hour after the last range, or 09:00–17:00 for an empty day
    const start = last ? Math.min(last.endMinute + 60, 1380) : 540;
    updateDay(day, [...week[day], { startMinute: start, endMinute: Math.min(start + (last ? 120 : 480), 1440) }]);
  };

  const copyToWeekdays = (day: number) => setWeek((w) => w.map((d, i) => (i < 5 ? w[day].map((r) => ({ ...r })) : d)));

  const save = () =>
    startTransition(async () => {
      const result = await saveWeeklyHours(rules);
      if (result.error) toast.error(result.error);
      else {
        setSaved(JSON.stringify(rules));
        toast.success(result.ok ?? 'Saved');
      }
    });

  return (
    <div className="mt-4">
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200/80 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {WEEKDAYS.map((name, day) => (
          <li key={name} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
            <div className="flex w-32 shrink-0 items-center gap-2 pt-1.5">
              <input
                id={`day-${day}`}
                type="checkbox"
                checked={week[day].length > 0}
                onChange={(e) => (e.target.checked ? addRange(day) : updateDay(day, []))}
                className="size-4 accent-[var(--color-accent)]"
              />
              <label htmlFor={`day-${day}`} className="text-sm font-medium">
                {name}
              </label>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {week[day].length === 0 && <p className="pt-1.5 text-sm text-stone-500">Unavailable</p>}
              {week[day].map((range, k) => (
                <div key={k} className="flex flex-wrap items-center gap-2">
                  <TimeSelect
                    label={`${name} from`}
                    value={range.startMinute}
                    max={1410}
                    onChange={(m) =>
                      updateDay(
                        day,
                        week[day].map((r, j) =>
                          j === k ? { startMinute: m, endMinute: Math.max(r.endMinute, m + 30) } : r,
                        ),
                      )
                    }
                  />
                  <span className="text-stone-400">–</span>
                  <TimeSelect
                    label={`${name} until`}
                    value={range.endMinute}
                    min={range.startMinute + 30}
                    onChange={(m) =>
                      updateDay(
                        day,
                        week[day].map((r, j) => (j === k ? { ...r, endMinute: m } : r)),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${name} time range`}
                    onClick={() =>
                      updateDay(
                        day,
                        week[day].filter((_, j) => j !== k),
                      )
                    }
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                  {range.endMinute - range.startMinute < lessonMinutes && (
                    <span className="text-xs text-amber-700 dark:text-amber-300">Shorter than one lesson</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-1 sm:pt-0.5">
              <Button size="sm" variant="ghost" onClick={() => addRange(day)} aria-label={`Add time range on ${name}`}>
                <Plus className="size-3.5" aria-hidden /> Add
              </Button>
              {week[day].length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToWeekdays(day)}
                  title="Use these hours Monday to Friday"
                >
                  <Copy className="size-3.5" aria-hidden /> Mon–Fri
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={save} loading={pending} disabled={!dirty || 'error' in validation}>
          Save weekly hours
        </Button>
        {'error' in validation ? (
          <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>
        ) : (
          <p className="text-sm text-stone-500">
            {hoursPerWeek} hours a week{dirty ? ' · unsaved changes' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
