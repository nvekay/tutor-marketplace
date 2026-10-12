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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14">
      <h1 className="text-4xl font-semibold">Welcome in</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Pick a side of the marketplace to explore, or use your account.
      </p>
      <div className="mt-8">
        <DemoSignIn next={next} />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        or with your account
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="mx-auto max-w-sm">
        <SignInForm next={next} />
      </div>
    </main>
  );
}
