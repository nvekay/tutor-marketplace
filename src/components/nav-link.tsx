'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Header link that is highlighted on its own section */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // Whole path segments only: "/tutor" must not light up on "/tutors"
  const path = href.split(/[?#]/)[0];
  const active = path !== '/' && (pathname === path || pathname.startsWith(`${path}/`));
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors ${
        active
          ? 'text-stone-900 underline decoration-2 underline-offset-[6px] dark:text-white'
          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
