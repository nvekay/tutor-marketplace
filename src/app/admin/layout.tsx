import { SectionTabs } from '@/components/section-tabs';
import { requireViewer } from '@/lib/auth';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/tutors', label: 'Tutors' },
  { href: '/admin/events', label: 'Webhooks' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer('admin');
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <SectionTabs tabs={TABS} label="Admin" />
      {viewer.isDemo && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Shared demo admin. Every action moves Stripe test-mode money only: try resolving a complaint or paying a
          tutor, and follow the result in the booking’s timeline.
        </p>
      )}
      {children}
    </main>
  );
}
