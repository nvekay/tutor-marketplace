import 'server-only';
// Read models for the admin panel. Runs with the service role: callers must check requireViewer('admin').
import { createSupabaseAdminClient } from './db/admin';
import type { Database } from './db/database.types';

type BookingStatus = Database['public']['Enums']['booking_status'];
type PayoutStatus = Database['public']['Enums']['payout_status'];

export interface Metrics {
  /** Paid by students (seeded demo history excluded: it has no Stripe money behind it) */
  collectedCents: number;
  refundedCents: number;
  paidToTutorsCents: number;
  /** Scheduled or held for tutors */
  owedToTutorsCents: number;
  /** Taken back by card holders' banks */
  lostToChargebacksCents: number;
  /** Fees on money that wasn't refunded, minus chargeback losses */
  platformRevenueCents: number;
  paidBookings: number;
  openComplaints: number;
  openChargebacks: number;
}

const PAID_STATUSES: BookingStatus[] = ['confirmed', 'completed', 'disputed', 'cancelled'];

export async function getMetrics(): Promise<Metrics> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('bookings')
    .select(
      'status, payout_status, price_cents, refunded_cents, payout_cents, platform_fee_cents, stripe_dispute_id, charge_id, resolution',
    )
    .eq('seeded', false)
    .in('status', PAID_STATUSES)
    .not('charge_id', 'is', null);
  if (error) throw error;

  const m: Metrics = {
    collectedCents: 0,
    refundedCents: 0,
    paidToTutorsCents: 0,
    owedToTutorsCents: 0,
    lostToChargebacksCents: 0,
    platformRevenueCents: 0,
    paidBookings: data.length,
    openComplaints: 0,
    openChargebacks: 0,
  };
  for (const b of data) {
    m.collectedCents += b.price_cents;
    m.refundedCents += b.refunded_cents;
    const tutorShare = b.payout_cents ?? (b.status === 'cancelled' ? 0 : b.price_cents - b.platform_fee_cents);
    if (b.payout_status === 'paid') m.paidToTutorsCents += tutorShare;
    if (b.payout_status === 'scheduled' || b.payout_status === 'held') m.owedToTutorsCents += tutorShare;
    // Upcoming lessons ('none') will owe the tutor their share too; reversed/not_due owe nothing
    const owesTutor = ['none', 'scheduled', 'held', 'paid'].includes(b.payout_status) ? tutorShare : 0;
    const lost = b.resolution?.startsWith('Chargeback lost') ? b.price_cents : 0;
    m.lostToChargebacksCents += lost;
    m.platformRevenueCents += b.price_cents - b.refunded_cents - owesTutor - lost;
    if (b.status === 'disputed' && !b.stripe_dispute_id) m.openComplaints++;
    if (b.status === 'disputed' && b.stripe_dispute_id) m.openChargebacks++;
  }
  return m;
}

export interface AdminBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  payoutStatus: PayoutStatus;
  priceCents: number;
  refundedCents: number;
  payoutCents: number | null;
  studentName: string;
  tutorName: string;
  disputeReason: string | null;
  chargeback: boolean;
  seeded: boolean;
  createdAt: string;
}

export const BOOKING_FILTERS = ['all', 'upcoming', 'disputed', 'payout_due', 'cancelled', 'completed'] as const;
export type BookingFilter = (typeof BOOKING_FILTERS)[number];

export async function listBookings(filter: BookingFilter, limit = 100): Promise<AdminBooking[]> {
  const db = createSupabaseAdminClient();
  let query = db
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, payout_status, price_cents, refunded_cents, payout_cents, dispute_reason, stripe_dispute_id, seeded, created_at, student:profiles!bookings_student_id_fkey(full_name), tutor:tutors(profiles(full_name))',
    )
    .neq('status', 'expired');
  if (filter === 'upcoming') query = query.in('status', ['pending_payment', 'confirmed']).order('starts_at');
  else {
    if (filter === 'disputed') query = query.eq('status', 'disputed');
    if (filter === 'payout_due') query = query.in('payout_status', ['scheduled', 'held']);
    if (filter === 'cancelled') query = query.eq('status', 'cancelled');
    if (filter === 'completed') query = query.eq('status', 'completed');
    query = query.order('created_at', { ascending: false });
  }
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data.map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    payoutStatus: b.payout_status,
    priceCents: b.price_cents,
    refundedCents: b.refunded_cents,
    payoutCents: b.payout_cents,
    studentName: b.student?.full_name ?? 'Student',
    tutorName: b.tutor?.profiles?.full_name ?? 'Tutor',
    disputeReason: b.dispute_reason,
    chargeback: Boolean(b.stripe_dispute_id),
    seeded: b.seeded,
    createdAt: b.created_at,
  }));
}

export async function getBookingDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createSupabaseAdminClient();
  const [{ data: booking }, { data: events }] = await Promise.all([
    db
      .from('bookings')
      .select(
        '*, student:profiles!bookings_student_id_fkey(full_name), tutor:tutors(stripe_account_id, profiles(full_name))',
      )
      .eq('id', id)
      .maybeSingle(),
    db.from('booking_events').select('id, type, actor_role, data, created_at').eq('booking_id', id).order('id'),
  ]);
  return booking ? { booking, events: events ?? [] } : null;
}

export async function listTutorAccounts() {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('tutors')
    .select(
      'profile_id, headline, listed, stripe_account_id, transfers_enabled, payouts_enabled, stripe_requirements, stripe_synced_at, hourly_rate_cents, rating_avg, rating_count, profiles(full_name, is_demo)',
    )
    .order('listed', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function listStripeEvents(limit = 50) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('stripe_events')
    .select('id, type, received_at, processed_at, error')
    .order('received_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Links to the Stripe Dashboard (test mode) for an object id */
export function stripeDashboardUrl(id: string): string | null {
  const base = 'https://dashboard.stripe.com/test';
  if (id.startsWith('pi_')) return `${base}/payments/${id}`;
  if (id.startsWith('tr_')) return `${base}/connect/transfers/${id}`;
  if (id.startsWith('acct_')) return `${base}/connect/accounts/${id}`;
  if (id.startsWith('du_')) return `${base}/disputes/${id}`;
  if (id.startsWith('evt_')) return `${base}/events/${id}`;
  if (id.startsWith('cs_')) return `${base}/checkout/sessions/${id}`;
  return null;
}
