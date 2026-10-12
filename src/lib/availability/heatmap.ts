// The tutor's weekly hours as a week × time-of-day grid in the viewer's time zone (as on italki):
// a quick "when is this tutor free for me" without generating every slot. Pure, unit tested.
import { TZDate } from '@date-fns/tz';
import { addDays, isoWeekday, localDateKey, type WeeklyRule } from './slots';

/** Four-hour bands of the viewer's day: 00–04, 04–08, …, 20–24 */
export const HEAT_BANDS = [0, 4, 8, 12, 16, 20].map((from) => ({ from, to: from + 4 }));

export const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** grid[weekday 0 = Monday][band] is true when the tutor teaches at some point in that band */
export type Heatmap = boolean[][];

const STEP_MINUTES = 30;

export function weeklyHeatmap(
  rules: WeeklyRule[],
  tutorTimezone: string,
  viewerTimezone: string,
  reference = new Date(),
): Heatmap {
  const grid: Heatmap = Array.from({ length: 7 }, () => HEAT_BANDS.map(() => false));
  // A concrete week in the tutor's calendar, so DST and date-line shifts are real ones
  const today = localDateKey(reference, tutorTimezone);
  const monday = addDays(today, 1 - isoWeekday(today));

  for (const rule of rules) {
    const date = addDays(monday, rule.weekday - 1);
    const [y, m, d] = date.split('-').map(Number);
    const start = new TZDate(y, m - 1, d, 0, 0, tutorTimezone).getTime() + rule.startMinute * 60_000;
    const end = new TZDate(y, m - 1, d, 0, 0, tutorTimezone).getTime() + rule.endMinute * 60_000;
    for (let t = start; t < end; t += STEP_MINUTES * 60_000) {
      const local = new TZDate(t, viewerTimezone);
      const weekday = isoWeekday(localDateKey(new Date(t), viewerTimezone)) - 1;
      grid[weekday][Math.floor(local.getHours() / 4)] = true;
    }
  }
  return grid;
}

export type AvailabilityFilter = 'weekdays' | 'weekends' | 'mornings' | 'afternoons' | 'evenings';

/** "I'm available" filter of the catalogue, checked against the viewer-time heatmap */
export function matchesAvailability(grid: Heatmap, filter: AvailabilityFilter): boolean {
  const any = (days: number[], bands: number[]) => days.some((d) => bands.some((b) => grid[d][b]));
  const all = [0, 1, 2, 3, 4, 5, 6];
  switch (filter) {
    case 'weekdays':
      return any([0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]);
    case 'weekends':
      return any([5, 6], [0, 1, 2, 3, 4, 5]);
    case 'mornings':
      return any(all, [1, 2]); // 04–12
    case 'afternoons':
      return any(all, [3]); // 12–16
    case 'evenings':
      return any(all, [4, 5]); // 16–24
  }
}
