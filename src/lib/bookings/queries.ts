import 'server-only';
import type { Viewer } from '../auth';
import { createSupabaseServerClient } from '../db/server';
import type { BookingStatus } from './state';

export interface BookingItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  payoutStatus: string;
  priceCents: number;
  platformFeeCents: number;
  refundedCents: number;
  /** The other side: the tutor for a student, the student for a tutor */
  counterpartId: string;
  counterpartName: string;
}

/** The viewer's own bookings (row level security limits them to the student's or the tutor's) */
export async function listMyBookings(viewer: Viewer): Promise<{ upcoming: BookingItem[]; past: BookingItem[] }> {
  const supabase = await createSupabaseServerClient();
  const column = viewer.role === 'tutor' ? 'tutor_id' : 'student_id';
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, payout_status, price_cents, platform_fee_cents, refunded_cents, student_id, tutor_id, student:profiles!bookings_student_id_fkey(full_name), tutor:tutors(profiles(full_name))',
    )
    .eq(column, viewer.id)
    .neq('status', 'expired')
    .order('starts_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`Could not load lessons: ${error.message}`);

  const now = Date.now();
  const items = data.map<BookingItem>((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    payoutStatus: b.payout_status,
    priceCents: b.price_cents,
    platformFeeCents: b.platform_fee_cents,
    refundedCents: b.refunded_cents,
    counterpartId: viewer.role === 'tutor' ? b.student_id : b.tutor_id,
    counterpartName:
      (viewer.role === 'tutor' ? b.student?.full_name : b.tutor?.profiles?.full_name) ??
      (viewer.role === 'tutor' ? 'Student' : 'Tutor'),
  }));
  const isUpcoming = (b: BookingItem) =>
    new Date(b.endsAt).getTime() > now && ['pending_payment', 'confirmed', 'disputed'].includes(b.status);
  return { upcoming: items.filter(isUpcoming), past: items.filter((b) => !isUpcoming(b)).reverse() };
}
