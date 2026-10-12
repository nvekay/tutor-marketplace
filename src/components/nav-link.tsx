'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Header link that is highlighted on its own section */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 whitespace-nowrap transition-colors sm:px-3.5 ${
        active
          ? 'bg-stone-900 font-medium text-paper dark:bg-stone-100'
          : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
      }`}
    >
      {children}
    </Link>
  );
}
