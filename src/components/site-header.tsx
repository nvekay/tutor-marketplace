import { GraduationCap, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { getViewer, homeFor } from '@/lib/auth';
import { NavLink } from './nav-link';

const HOME_LABEL = { student: 'My lessons', tutor: 'Tutor dashboard', admin: 'Admin' } as const;

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold whitespace-nowrap">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-hidden>
            <GraduationCap className="size-4" />
          </span>
          Tutor Market
          <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent sm:inline dark:bg-slate-800 dark:text-teal-300">
            demo
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/tutors">
            <span className="sm:hidden">Tutors</span>
            <span className="hidden sm:inline">Find a tutor</span>
          </NavLink>
          {viewer ? (
            <>
              <NavLink href={homeFor(viewer.role)}>{HOME_LABEL[viewer.role]}</NavLink>
              <form action={signOut}>
                <button
                  type="submit"
                  title={`Signed in as ${viewer.fullName || viewer.email}`}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                >
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <NavLink href="/login">Sign in</NavLink>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-white transition-colors hover:bg-accent-strong"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
