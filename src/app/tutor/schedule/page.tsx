import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { getMyTutorProfile } from '@/lib/tutor-account';
import { DateExceptions } from './date-exceptions';
import { WeeklyHoursEditor } from './weekly-hours-editor';

export const metadata: Metadata = { title: 'Schedule · Tutor Market' };

export default async function TutorSchedulePage() {
  const viewer = await requireViewer('tutor');
  const tutor = await getMyTutorProfile(viewer);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-semibold">Weekly hours</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          When students can book you, in your time zone ({tutor.timezone}). Lessons start on the hour or half hour, at
          least 12 hours ahead and up to 60 days ahead. Students see these times in their own time zone.
        </p>
        <WeeklyHoursEditor initial={tutor.rules} lessonMinutes={tutor.lessonMinutes} />
      </section>
      <section>
        <h2 className="text-xl font-semibold">Days off and special hours</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Replace the weekly hours of a specific date. Lessons that are already booked stay booked.
        </p>
        <DateExceptions exceptions={tutor.exceptions} timezone={tutor.timezone} />
      </section>
    </div>
  );
}
