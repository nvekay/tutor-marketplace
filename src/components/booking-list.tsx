import Link from 'next/link';
import type { BookingItem } from '@/lib/bookings/queries';
import { formatUsd } from '@/lib/tutors';
import { Avatar } from './avatar';
import { BookingActions } from './booking-actions';

/** Tutor's view of the money for a lesson */
const PAYOUT: Record<string, string> = {
  none: 'paid after the lesson',
  scheduled: 'payout scheduled',
  held: 'on hold',
  paid: 'paid out',
  reversed: 'payout reversed',
};

const STATUS: Record<BookingItem['status'], { label: string; className: string }> = {
  pending_payment: {
    label: 'Awaiting payment',
    className: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  completed: { label: 'Completed', className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  disputed: { label: 'Under review', className: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  cancelled: { label: 'Cancelled', className: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' },
  expired: { label: 'Not paid', className: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' },
};

/** Lessons of a student or a tutor, times in the viewer's time zone */
export function BookingList({
  items,
  timezone,
  perspective,
  empty,
}: {
  items: BookingItem[];
  timezone: string;
  perspective: 'student' | 'tutor';
  empty: React.ReactNode;
}) {
  if (items.length === 0) return <>{empty}</>;
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  });

  return (
    <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200/80 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
      {items.map((b) => {
        const status = STATUS[b.status];
        const start = new Date(b.startsAt);
        return (
          <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div className="w-28 shrink-0">
              <p className="font-medium">{day.format(start)}</p>
              <p className="text-stone-500 tabular-nums">
                {time.format(start)}–{time.format(new Date(b.endsAt))}
              </p>
            </div>
            <Avatar name={b.counterpartName} src={b.counterpartAvatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              {perspective === 'student' ? (
                <Link href={`/tutors/${b.counterpartId}`} className="font-medium hover:text-accent">
                  {b.counterpartName}
                </Link>
              ) : (
                <p className="font-medium">{b.counterpartName}</p>
              )}
              <p className="text-stone-500">
                {perspective === 'tutor' ? (
                  <>
                    Your share {formatUsd(b.tutorCents)}
                    {PAYOUT[b.payoutStatus] && ` · ${PAYOUT[b.payoutStatus]}`}
                  </>
                ) : (
                  <>
                    Paid {formatUsd(b.priceCents)}
                    {b.refundedCents > 0 && ` · refunded ${formatUsd(b.refundedCents)}`}
                  </>
                )}
              </p>
              {(b.resolution ?? b.disputeReason) && (
                <p className="text-xs text-stone-500">{b.resolution ?? b.disputeReason}</p>
              )}
            </div>
            <span className={`rounded px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            {perspective === 'student' && b.status === 'pending_payment' && (
              <Link
                href={`/checkout/resume?booking=${b.id}`}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-strong"
              >
                Pay now
              </Link>
            )}
            <BookingActions item={b} perspective={perspective} />
          </li>
        );
      })}
    </ul>
  );
}
