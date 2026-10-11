import { SectionTabs } from '@/components/section-tabs';
import { requireViewer } from '@/lib/auth';

const TABS = [
  { href: '/tutor', label: 'Overview' },
  { href: '/tutor/profile', label: 'Profile' },
  { href: '/tutor/schedule', label: 'Schedule' },
];

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  await requireViewer('tutor');
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <SectionTabs tabs={TABS} label="Tutor dashboard" />
      {children}
    </main>
  );
}
