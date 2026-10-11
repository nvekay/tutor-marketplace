import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Admin · Tutor Market' };

export default async function AdminPage() {
  const viewer = await requireViewer('admin');
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      {viewer.isDemo && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Read-only demo account: you can see everything, but refunds, payouts and dispute decisions are turned off.
        </p>
      )}
    </main>
  );
}
