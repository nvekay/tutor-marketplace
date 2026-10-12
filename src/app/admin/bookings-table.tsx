import Link from 'next/link';
import type { AdminBooking } from '@/lib/admin';
import { formatUsd } from '@/lib/tutors';
import { PayoutBadge, StatusBadge } from './badges';

const when = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

/** Bookings for admins; times in UTC */
export function BookingsTable({ items, empty }: { items: AdminBooking[]; empty: string }) {
  if (items.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-700">
        {empty}
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-stone-900">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900">
          <tr>
            <th className="px-3 py-2 font-medium">Lesson (UTC)</th>
            <th className="px-3 py-2 font-medium">Student → tutor</th>
            <th className="px-3 py-2 text-right font-medium">Price</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
          {items.map((b) => (
            <tr key={b.id} className="group transition-colors hover:bg-stone-50 dark:hover:bg-stone-900">
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                <Link href={`/admin/bookings/${b.id}`} className="font-medium group-hover:text-accent">
                  {when.format(new Date(b.startsAt))}
                </Link>
                {b.seeded && <span className="ml-1.5 text-xs text-stone-400">seed</span>}
              </td>
              <td className="px-3 py-2">
                {b.studentName} → {b.tutorName}
                {b.disputeReason && (
                  <p className="max-w-md truncate text-xs text-stone-500" title={b.disputeReason}>
                    {b.disputeReason}
                  </p>
                )}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                {formatUsd(b.priceCents)}
                {b.refundedCents > 0 && (
                  <span className="block text-xs text-stone-500">−{formatUsd(b.refundedCents)} refunded</span>
                )}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={b.status} chargeback={b.chargeback} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <PayoutBadge status={b.payoutStatus} />
                {b.payoutCents !== null && b.payoutStatus !== 'not_due' && (
                  <span className="ml-1.5 text-xs text-stone-500 tabular-nums">{formatUsd(b.payoutCents)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
