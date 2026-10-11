import { Play } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { getMetrics, listBookings } from '@/lib/admin';
import { formatUsd } from '@/lib/tutors';
import { runJobsNow } from './actions';
import { BookingsTable } from './bookings-table';

export const metadata: Metadata = { title: 'Admin · Tutor Market' };

export default async function AdminPage() {
  const [m, disputed, payoutsDue] = await Promise.all([
    getMetrics(),
    listBookings('disputed', 10),
    listBookings('payout_due', 10),
  ]);

  const cards = [
    {
      label: 'Paid by students',
      value: formatUsd(m.collectedCents),
      hint: `${m.paidBookings} paid booking${m.paidBookings === 1 ? '' : 's'}`,
    },
    { label: 'Refunded', value: formatUsd(m.refundedCents) },
    { label: 'Paid to tutors', value: formatUsd(m.paidToTutorsCents) },
    { label: 'Owed to tutors', value: formatUsd(m.owedToTutorsCents), hint: 'scheduled or on hold' },
    { label: 'Lost to chargebacks', value: formatUsd(m.lostToChargebacksCents) },
    {
      label: 'Platform revenue',
      value: formatUsd(m.platformRevenueCents),
      hint: 'commission on money kept',
      strong: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments overview</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Stripe test mode. Seeded demo history is excluded.
          </p>
        </div>
        <ActionButton variant="primary" action={runJobsNow}>
          <Play className="size-4" aria-hidden /> Run jobs now
        </ActionButton>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border p-4 ${c.strong ? 'border-accent/50 bg-accent-soft dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800'}`}
          >
            <dt className="text-xs text-slate-500">{c.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{c.value}</dd>
            {c.hint && <dd className="text-xs text-slate-500">{c.hint}</dd>}
          </div>
        ))}
      </dl>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-medium">
            Needs attention{' '}
            <span className="text-sm font-normal text-slate-500">
              · {m.openComplaints} complaints, {m.openChargebacks} chargebacks
            </span>
          </h2>
          <Link href="/admin/bookings?filter=disputed" className="text-sm text-accent hover:underline">
            All disputed
          </Link>
        </div>
        <BookingsTable items={disputed} empty="No open complaints or chargebacks." />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-medium">Payouts scheduled or on hold</h2>
          <Link href="/admin/bookings?filter=payout_due" className="text-sm text-accent hover:underline">
            All payouts
          </Link>
        </div>
        <BookingsTable items={payoutsDue} empty="No payouts waiting." />
      </section>
    </div>
  );
}
