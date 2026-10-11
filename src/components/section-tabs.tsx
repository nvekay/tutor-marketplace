'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Underlined tabs for a section's pages; a tab is active on its page and on pages below it */
export function SectionTabs({ tabs, label }: { tabs: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  // The longest matching href wins, so "/admin" isn't active on "/admin/bookings"
  const active = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active === tab.href ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
            active === tab.href
              ? 'border-accent font-medium text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:hover:border-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
