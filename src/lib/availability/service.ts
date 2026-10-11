import 'server-only';
import { BLOCKING_STATUSES, isStaleHold } from '../bookings/state';
import { createSupabaseAdminClient } from '../db/admin';
import { generateSlots, type DateException, type SlotQuery, type TimeRange, type WeeklyRule } from './slots';

/**
 * Everything needed to compute a tutor's free slots. Read with the service role because students
 * can't see other students' bookings; only start/end times leave this function.
 */
export async function loadSlotQuery(
  tutorId: string,
  range: { from: Date; to: Date },
  now = new Date(),
): Promise<SlotQuery | null> {
  const db = createSupabaseAdminClient();
  const [tutor, rules, exceptions, busy] = await Promise.all([
    db.from('tutors').select('lesson_minutes, listed, profiles(timezone)').eq('profile_id', tutorId).maybeSingle(),
    db.from('availability_rules').select('weekday, start_minute, end_minute').eq('tutor_id', tutorId),
    db.from('availability_exceptions').select('date, start_minute, end_minute').eq('tutor_id', tutorId),
    db
      .from('bookings')
      .select('starts_at, ends_at, status, hold_expires_at')
      .eq('tutor_id', tutorId)
      .in('status', [...BLOCKING_STATUSES])
      .lt('starts_at', range.to.toISOString())
      .gt('ends_at', range.from.toISOString()),
  ]);
  for (const r of [tutor, rules, exceptions, busy]) if (r.error) throw new Error(r.error.message);
  if (!tutor.data) return null;

  return {
    timezone: tutor.data.profiles?.timezone ?? 'UTC',
    lessonMinutes: tutor.data.lesson_minutes,
    rules: (rules.data ?? []).map<WeeklyRule>((r) => ({
      weekday: r.weekday,
      startMinute: r.start_minute,
      endMinute: r.end_minute,
    })),
    exceptions: (exceptions.data ?? []).map<DateException>((e) => ({
      date: e.date,
      startMinute: e.start_minute,
      endMinute: e.end_minute,
    })),
    // Paid lessons and checkouts in progress; abandoned checkouts past their hold don't count
    busy: (busy.data ?? [])
      .filter((b) => !isStaleHold(b, now))
      .map<TimeRange>((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) })),
    from: range.from,
    to: range.to,
    now,
  };
}

/** Free slots of a tutor in a time range */
export async function findSlots(tutorId: string, range: { from: Date; to: Date }, now = new Date()) {
  const query = await loadSlotQuery(tutorId, range, now);
  return query ? generateSlots(query) : [];
}
