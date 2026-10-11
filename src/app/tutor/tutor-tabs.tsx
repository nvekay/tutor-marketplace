'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/tutor', label: 'Overview' },
  { href: '/tutor/profile', label: 'Profile' },
  { href: '/tutor/schedule', label: 'Schedule' },
];

export function TutorTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-800" aria-label="Tutor dashboard">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-accent font-medium text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:hover:border-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
