import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer, homeFor, safeNext } from '@/lib/auth';
import { DemoSignIn, SignInForm } from '../auth-forms';

export const metadata: Metadata = { title: 'Sign in · Tutor Market' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? undefined;
  const viewer = await getViewer();
  if (viewer) redirect(next ?? homeFor(viewer.role));

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <div className="mt-6">
        <DemoSignIn next={next} />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        or with your account
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mx-auto max-w-sm">
        <SignInForm next={next} />
      </div>
    </main>
  );
}
