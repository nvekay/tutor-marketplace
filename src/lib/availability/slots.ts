// Bookable lesson slots from a tutor's weekly hours. Pure functions: no database, no clock,
// so every rule (time zones, DST, notice period, busy times) is covered by unit tests.
import { TZDate } from '@date-fns/tz';

/** Weekly working hours in the tutor's own time zone. weekday is ISO: 1 = Monday … 7 = Sunday */
export interface WeeklyRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

/** A date (yyyy-MM-dd, tutor's time zone) that replaces its weekday's hours: null minutes = day off */
export interface DateException {
  date: string;
  startMinute: number | null;
  endMinute: number | null;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SlotQuery {
  rules: WeeklyRule[];
  exceptions?: DateException[];
  /** Existing bookings and holds of the tutor */
  busy?: TimeRange[];
  timezone: string;
  lessonMinutes: number;
  from: Date;
  to: Date;
  now: Date;
}

/** Lessons can be booked from 12 hours ahead (time for the tutor to prepare) */
export const MIN_NOTICE_MINUTES = 12 * 60;
/** …and up to 60 days ahead: card payments can't be held by the platform much longer than that */
export const BOOKING_HORIZON_DAYS = 60;
/** Lessons start on the hour or half hour */
export const SLOT_STEP_MINUTES = 30;

const MINUTE = 60_000;
const DAY = 86_400_000;

/** Calendar date of an instant in a time zone, as yyyy-MM-dd */
export function localDateKey(instant: Date, timezone: string): string {
  const d = new TZDate(instant.getTime(), timezone);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The instant of a wall-clock minute on a local date, or null when that time doesn't exist (DST gap) */
function atLocalMinute(date: string, minute: number, timezone: string): Date | null {
  const [y, m, d] = date.split('-').map(Number);
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const instant = new TZDate(y, m - 1, d, hours, mins, timezone);
  // 24:00 is midnight of the next day; any other time must read back exactly as requested
  if (minute === 1440) return new Date(instant.getTime());
  if (instant.getHours() !== hours || instant.getMinutes() !== mins) return null;
  return new Date(instant.getTime());
}

/** ISO weekday (1 = Monday) of a yyyy-MM-dd date */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/** yyyy-MM-dd plus a number of calendar days */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const nextDate = (date: string) => addDays(date, 1);

/** The instant a local calendar day begins (usually midnight; later where DST starts at midnight) */
export function startOfLocalDay(date: string, timezone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(new TZDate(y, m - 1, d, 0, 0, timezone).getTime());
}

/** Working windows of one local date: an exception replaces the weekly hours of that day */
function windowsFor(date: string, rules: WeeklyRule[], exceptions: DateException[]) {
  const special = exceptions.filter((e) => e.date === date);
  if (special.length > 0) {
    return special
      .filter((e) => e.startMinute !== null && e.endMinute !== null)
      .map((e) => ({ startMinute: e.startMinute!, endMinute: e.endMinute! }));
  }
  const weekday = isoWeekday(date);
  return rules.filter((r) => r.weekday === weekday);
}

const overlaps = (a: TimeRange, b: TimeRange) => a.start < b.end && b.start < a.end;

/**
 * Free lesson slots between `from` and `to`, sorted by start time.
 * A slot is offered when it fits inside a working window, starts at least MIN_NOTICE_MINUTES
 * after `now`, no later than BOOKING_HORIZON_DAYS ahead, and doesn't overlap a busy range.
 */
export function generateSlots(query: SlotQuery): TimeRange[] {
  const { rules, exceptions = [], busy = [], timezone, lessonMinutes, from, to, now } = query;
  const earliest = Math.max(from.getTime(), now.getTime() + MIN_NOTICE_MINUTES * MINUTE);
  const latest = Math.min(to.getTime(), now.getTime() + BOOKING_HORIZON_DAYS * DAY);
  if (earliest >= latest) return [];

  const slots: TimeRange[] = [];
  const seen = new Set<number>();
  const lastDate = localDateKey(new Date(latest), timezone);
  for (let date = localDateKey(new Date(earliest), timezone); date <= lastDate; date = nextDate(date)) {
    for (const window of windowsFor(date, rules, exceptions)) {
      const windowEnd = atLocalMinute(date, window.endMinute, timezone);
      if (!windowEnd) continue;
      for (let minute = window.startMinute; minute + lessonMinutes <= window.endMinute; minute += SLOT_STEP_MINUTES) {
        const start = atLocalMinute(date, minute, timezone);
        if (!start) continue; // skipped by a DST jump
        const end = new Date(start.getTime() + lessonMinutes * MINUTE);
        // Measured in real time: on a DST day a 3-hour window may only hold 2 hours of lessons
        if (end > windowEnd) continue;
        if (start.getTime() < earliest || start.getTime() > latest || end.getTime() > to.getTime()) continue;
        if (seen.has(start.getTime())) continue; // overlapping windows (or a repeated hour in autumn)
        const slot = { start, end };
        if (busy.some((b) => overlaps(slot, b))) continue;
        seen.add(start.getTime());
        slots.push(slot);
      }
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Whether a requested lesson time is one of the offered slots (checked again when booking) */
export function isBookable(query: Omit<SlotQuery, 'from' | 'to'>, start: Date): boolean {
  const end = new Date(start.getTime() + query.lessonMinutes * MINUTE);
  return generateSlots({ ...query, from: start, to: end }).some((s) => s.start.getTime() === start.getTime());
}

/** Merges and validates a tutor's weekly hours: sorted, within a day, no overlaps on the same weekday */
export function normalizeRules(rules: WeeklyRule[]): { rules: WeeklyRule[] } | { error: string } {
  const sorted = [...rules].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (const [i, r] of sorted.entries()) {
    if (!Number.isInteger(r.weekday) || r.weekday < 1 || r.weekday > 7) return { error: 'Unknown weekday' };
    if (r.startMinute < 0 || r.endMinute > 1440 || r.endMinute <= r.startMinute)
      return { error: 'Each time range must end after it starts' };
    if (r.startMinute % SLOT_STEP_MINUTES || r.endMinute % SLOT_STEP_MINUTES)
      return { error: 'Times must be on the hour or half hour' };
    const prev = sorted[i - 1];
    if (prev && prev.weekday === r.weekday && r.startMinute < prev.endMinute)
      return { error: `Time ranges overlap on ${WEEKDAYS[r.weekday - 1]}` };
  }
  return { rules: sorted };
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 570 → "09:30" */
export const minuteLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
