import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'My lessons · Tutor Market' };

export default async function StudentDashboardPage() {
  const viewer = await requireViewer('student');
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">My lessons</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Signed in as {viewer.fullName || viewer.email} · times shown in {viewer.timezone}
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
        <p className="font-medium">No lessons yet</p>
        <Link href="/tutors" className="mt-1 inline-block text-sm text-accent hover:underline">
          Find a tutor
        </Link>
      </div>
    </main>
  );
}
