import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer, homeFor } from '@/lib/auth';
import { SignUpForm } from '../auth-forms';

export const metadata: Metadata = { title: 'Create an account · Tutor Market' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  const { role } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Free. Payments run in Stripe test mode.</p>
      <div className="mt-6">
        <SignUpForm defaultRole={role === 'tutor' ? 'tutor' : 'student'} />
      </div>
    </main>
  );
}
