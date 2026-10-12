import type { Metadata } from 'next';
import Link from 'next/link';
import { BOOKING_FILTERS, listBookings, type BookingFilter } from '@/lib/admin';
import { BookingsTable } from '../bookings-table';

export const metadata: Metadata = { title: 'Bookings · Admin · Tutor Market' };

const LABELS: Record<BookingFilter, string> = {
  all: 'All',
  upcoming: 'Upcoming',
  disputed: 'Disputed',
  payout_due: 'Payouts due',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const requested = (await searchParams).filter;
  const filter = BOOKING_FILTERS.find((f) => f === requested) ?? 'all';
  const items = await listBookings(filter);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Bookings</h1>
      <nav className="mt-4 mb-4 flex flex-wrap gap-1.5" aria-label="Filter bookings">
        {BOOKING_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/admin/bookings' : `/admin/bookings?filter=${f}`}
            aria-current={f === filter ? 'page' : undefined}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              f === filter
                ? 'bg-accent text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
            }`}
          >
            {LABELS[f]}
          </Link>
        ))}
      </nav>
      <BookingsTable items={items} empty="No bookings here." />
      {items.length === 100 && <p className="mt-2 text-xs text-stone-500">Showing the latest 100.</p>}
    </div>
  );
}
