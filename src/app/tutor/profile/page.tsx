import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { getMyTutorProfile } from '@/lib/tutor-account';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Your profile · Tutor Market' };

export default async function TutorProfilePage() {
  const viewer = await requireViewer('tutor');
  const tutor = await getMyTutorProfile(viewer);
  const timezones = Intl.supportedValuesOf('timeZone');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        This is what students see in search and on your page.
      </p>
      <ProfileForm
        tutor={{
          fullName: tutor.fullName,
          timezone: tutor.timezone,
          headline: tutor.headline,
          bio: tutor.bio,
          subjects: tutor.subjects,
          hourlyRateUsd: tutor.hourlyRateCents / 100,
          lessonMinutes: tutor.lessonMinutes,
          isDemo: tutor.isDemo,
        }}
        timezones={timezones.includes(tutor.timezone) ? timezones : [tutor.timezone, ...timezones]}
      />
    </div>
  );
}
