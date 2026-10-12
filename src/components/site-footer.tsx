import Link from 'next/link';
import { LogoMark } from './logo';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 dark:border-stone-800">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-stone-500 sm:grid-cols-[1fr_auto]">
        <div className="max-w-md">
          <p className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
            <LogoMark className="size-5" /> tutormarket
          </p>
          <p className="mt-2">
            A demo of a lesson marketplace with escrow payments, running in Stripe test mode: no real money moves.
            Tutors, reviews and photos are fictional; the photos are AI-generated.
          </p>
        </div>
        <nav className="flex gap-5 sm:pt-7" aria-label="Footer">
          <Link href="/tutors" className="hover:text-stone-900 dark:hover:text-stone-100">
            Find tutors
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
