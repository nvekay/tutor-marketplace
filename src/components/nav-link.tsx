'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Header link that is highlighted on its own section */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors sm:px-3 ${
        active
          ? 'bg-slate-100 font-medium dark:bg-slate-800'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </Link>
  );
}
