import 'server-only';
import type { Viewer } from '../auth';
import { createSupabaseServerClient } from '../db/server';
import { env } from '../env';
import { canComplain, quoteCancellation } from './policy';
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
  /** What the tutor gets (or will get) for this lesson */
  tutorCents: number;
  /** The other side: the tutor for a student, the student for a tutor */
  counterpartId: string;
  counterpartName: string;
  /** Refund the student would get if the viewer cancelled now; null when it can't be cancelled */
  cancelRefundCents: number | null;
  lateCancellation: boolean;
  canReport: boolean;
  canReview: boolean;
  disputeReason: string | null;
  resolution: string | null;
}

/** The viewer's own bookings (row level security limits them to the student's or the tutor's) */
export async function listMyBookings(
  viewer: Viewer,
  now = new Date(),
): Promise<{ upcoming: BookingItem[]; past: BookingItem[] }> {
  const supabase = await createSupabaseServerClient();
  const column = viewer.role === 'tutor' ? 'tutor_id' : 'student_id';
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, payout_status, payout_cents, price_cents, platform_fee_cents, refunded_cents, dispute_reason, resolution, student_id, tutor_id, student:profiles!bookings_student_id_fkey(full_name), tutor:tutors(profiles(full_name)), reviews(rating)',
    )
    .eq(column, viewer.id)
    .neq('status', 'expired')
    .order('starts_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`Could not load lessons: ${error.message}`);

  const asTutor = viewer.role === 'tutor';
  const items = data.map<BookingItem>((b) => {
    const quote =
      b.status === 'confirmed'
        ? quoteCancellation({
            by: asTutor ? 'tutor' : 'student',
            startsAt: new Date(b.starts_at),
            now,
            priceCents: b.price_cents,
            feeBps: env().PLATFORM_FEE_BPS,
          })
        : null;
    return {
      id: b.id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      payoutStatus: b.payout_status,
      priceCents: b.price_cents,
      platformFeeCents: b.platform_fee_cents,
      refundedCents: b.refunded_cents,
      tutorCents: b.payout_cents ?? (b.status === 'cancelled' ? 0 : b.price_cents - b.platform_fee_cents),
      counterpartId: asTutor ? b.student_id : b.tutor_id,
      counterpartName:
        (asTutor ? b.student?.full_name : b.tutor?.profiles?.full_name) ?? (asTutor ? 'Student' : 'Tutor'),
      cancelRefundCents: quote?.allowed ? quote.refundCents : null,
      lateCancellation: quote?.allowed ? quote.late : false,
      canReport:
        !asTutor &&
        b.status === 'completed' &&
        b.payout_status === 'scheduled' &&
        canComplain(new Date(b.ends_at), now),
      canReview: !asTutor && b.status === 'completed' && !b.reviews,
      disputeReason: b.dispute_reason,
      resolution: b.resolution,
    };
  });
  const isUpcoming = (b: BookingItem) =>
    new Date(b.endsAt).getTime() > now.getTime() && ['pending_payment', 'confirmed', 'disputed'].includes(b.status);
  return { upcoming: items.filter(isUpcoming), past: items.filter((b) => !isUpcoming(b)).reverse() };
}
