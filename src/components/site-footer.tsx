import Link from 'next/link';
import { LogoMark } from './logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500">
        <p className="flex items-center gap-2">
          <LogoMark className="size-5" />
          Tutor Market: a demo of a lesson marketplace with escrow payments. Stripe test mode, no real money.
        </p>
        <nav className="flex gap-4">
          <Link href="/tutors" className="hover:text-stone-900 dark:hover:text-stone-100">
            Tutors
          </Link>
          <Link href="/login" className="hover:text-stone-900 dark:hover:text-stone-100">
            Try the demo
          </Link>
          <a
            href="https://github.com/nvekay/tutor-marketplace"
            target="_blank"
            rel="noreferrer"
            className="hover:text-stone-900 dark:hover:text-stone-100"
          >
            Source code
          </a>
        </nav>
      </div>
    </footer>
  );
}
