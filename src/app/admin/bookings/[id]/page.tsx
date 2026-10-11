import { ChevronLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookingDetail, stripeDashboardUrl } from '@/lib/admin';
import { quoteCancellation } from '@/lib/bookings/policy';
import { env } from '@/lib/env';
import { timeTravelAllowed } from '@/lib/jobs';
import { formatUsd } from '@/lib/tutors';
import { PayoutBadge, StatusBadge } from '../../badges';
import { AdminBookingActions } from './admin-booking-actions';

export const metadata: Metadata = { title: 'Booking · Admin · Tutor Market' };

const stamp = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

const EVENT_LABELS: Record<string, string> = {
  created: 'Slot held',
  checkout_started: 'Checkout opened',
  checkout_failed: 'Checkout failed',
  paid: 'Paid',
  hold_expired: 'Hold expired',
  hold_released: 'Hold released',
  late_payment_refunded: 'Late payment refunded',
  cancelled: 'Cancelled',
  completed: 'Lesson took place',
  complaint: 'Complaint',
  complaint_resolved: 'Complaint resolved',
  complaint_window_skipped: 'Complaint window skipped (demo)',
  paid_out: 'Tutor paid',
  payout_failed: 'Payout failed',
  chargeback_opened: 'Chargeback opened',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
};

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const detail = await getBookingDetail((await params).id);
  if (!detail) notFound();
  const { booking: b, events } = detail;

  const tutorShare = b.payout_cents ?? (b.status === 'cancelled' ? 0 : b.price_cents - b.platform_fee_cents);
  const quote =
    b.status === 'confirmed'
      ? quoteCancellation({
          by: 'admin',
          startsAt: new Date(b.starts_at),
          now: new Date(),
          priceCents: b.price_cents,
          feeBps: env().PLATFORM_FEE_BPS,
        })
      : null;
  const stripeIds = [
    ['Checkout session', b.checkout_session_id],
    ['Payment', b.payment_intent_id],
    ['Transfer to tutor', b.transfer_id],
    ['Tutor account', b.tutor?.stripe_account_id],
    ['Chargeback', b.stripe_dispute_id],
  ].filter((x): x is [string, string] => Boolean(x[1]));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/bookings"
        className="inline-flex w-fit items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ChevronLeft className="size-4" aria-hidden /> Bookings
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {b.student?.full_name} → {b.tutor?.profiles?.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {stamp.format(new Date(b.starts_at))} – {stamp.format(new Date(b.ends_at)).split(', ')[1]} UTC
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={b.status} chargeback={Boolean(b.stripe_dispute_id)} />
          <PayoutBadge status={b.payout_status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h2 className="font-medium">Money</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm sm:grid-cols-4">
              <dt className="text-slate-500">Price</dt>
              <dd className="tabular-nums">{formatUsd(b.price_cents)}</dd>
              <dt className="text-slate-500">Refunded</dt>
              <dd className="tabular-nums">{formatUsd(b.refunded_cents)}</dd>
              <dt className="text-slate-500">Tutor share</dt>
              <dd className="tabular-nums">{formatUsd(tutorShare)}</dd>
              <dt className="text-slate-500">Payout due</dt>
              <dd className="tabular-nums">
                {b.payout_due_at ? `${stamp.format(new Date(b.payout_due_at))} UTC` : '—'}
              </dd>
            </dl>
            {(b.dispute_reason || b.cancel_reason || b.resolution) && (
              <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                {b.dispute_reason && (
                  <p>
                    <span className="text-slate-500">Complaint:</span> {b.dispute_reason}
                  </p>
                )}
                {b.cancel_reason && (
                  <p>
                    <span className="text-slate-500">Cancel reason:</span> {b.cancel_reason}
                  </p>
                )}
                {b.resolution && (
                  <p>
                    <span className="text-slate-500">Resolution:</span> {b.resolution}
                  </p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-medium">Timeline</h2>
            <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-800">
              {events.map((e) => (
                <li key={e.id} className="mb-4 ml-4 text-sm">
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-accent dark:border-slate-950" />
                  <p className="font-medium">
                    {EVENT_LABELS[e.type] ?? e.type}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {stamp.format(new Date(e.created_at))} UTC · {e.actor_role}
                    </span>
                  </p>
                  {Object.keys(e.data as object).length > 0 && (
                    <p className="mt-0.5 font-mono text-xs break-all text-slate-500">{JSON.stringify(e.data)}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <AdminBookingActions
            bookingId={b.id}
            priceCents={b.price_cents}
            canCancel={quote?.allowed === true}
            canResolve={b.status === 'disputed' && !b.stripe_dispute_id}
            canFastForward={
              timeTravelAllowed() && (b.status === 'confirmed' || b.payout_status === 'scheduled') && !b.seeded
            }
            fastForwardLabel={b.status === 'confirmed' ? 'Finish the lesson now' : 'Skip the complaint window and pay'}
          />
          {stripeIds.length > 0 && (
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h2 className="font-medium">In Stripe</h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {stripeIds.map(([label, id]) => (
                  <li key={id}>
                    <span className="block text-xs text-slate-500">{label}</span>
                    <a
                      href={stripeDashboardUrl(id) ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs break-all text-accent hover:underline"
                    >
                      {id} <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
