import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Tutor dashboard · Tutor Market' };

export default async function TutorDashboardPage() {
  const viewer = await requireViewer('tutor');
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Tutor dashboard</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Signed in as {viewer.fullName || viewer.email} · {viewer.timezone}
      </p>
    </main>
  );
}
