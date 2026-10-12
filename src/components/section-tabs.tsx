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
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-stone-800" aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active === tab.href ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
            active === tab.href
              ? 'border-accent font-medium text-stone-900 dark:text-stone-100'
              : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800 dark:hover:border-stone-700 dark:hover:text-stone-200'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
