import { minuteLabel, SLOT_STEP_MINUTES } from '@/lib/availability/slots';

const OPTIONS = Array.from({ length: 1440 / SLOT_STEP_MINUTES + 1 }, (_, i) => i * SLOT_STEP_MINUTES);

const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none transition hover:border-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900';

/** Time of day in half-hour steps, 00:00 to 24:00 */
export function TimeSelect({
  value,
  onChange,
  min = 0,
  max = 1440,
  label,
}: {
  value: number;
  onChange: (minute: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} className={selectClass}>
      {OPTIONS.filter((m) => m >= min && m <= max).map((m) => (
        <option key={m} value={m}>
          {minuteLabel(m)}
        </option>
      ))}
    </select>
  );
}
