import { CalendarPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingList } from '@/components/booking-list';
import { requireViewer } from '@/lib/auth';
import { listMyBookings } from '@/lib/bookings/queries';

export const metadata: Metadata = { title: 'My lessons · Tutor Market' };

export default async function StudentDashboardPage() {
  const viewer = await requireViewer('student');
  const { upcoming, past } = await listMyBookings(viewer);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">My lessons</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Times shown in {viewer.timezone}</p>
        </div>
        <Link
          href="/tutors"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          <CalendarPlus className="size-4" aria-hidden /> Book a lesson
        </Link>
      </div>

      <h2 className="mt-8 mb-3 font-medium">Upcoming</h2>
      <BookingList
        items={upcoming}
        timezone={viewer.timezone}
        perspective="student"
        empty={
          <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center dark:border-stone-700">
            <p className="font-medium">No upcoming lessons</p>
            <Link href="/tutors" className="mt-1 inline-block text-sm text-accent hover:underline">
              Find a tutor
            </Link>
          </div>
        }
      />

      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-medium">Past and cancelled</h2>
          <BookingList items={past} timezone={viewer.timezone} perspective="student" empty={null} />
        </>
      )}
    </main>
  );
}
