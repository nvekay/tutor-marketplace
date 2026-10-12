'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { markNotificationsRead } from '@/app/actions/notifications';

export interface NotificationView {
  id: number;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
}

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

export function NotificationBell({ items, unread }: { items: NotificationView[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Opening the list counts as reading it
    if (next && unread > 0) startTransition(() => markNotificationsRead());
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-8 place-items-center rounded-md text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <p className="border-b border-stone-200 px-4 py-2.5 text-sm font-medium dark:border-stone-800">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Nothing yet</p>
          ) : (
            <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <span className="flex items-start gap-2">
                      {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="New" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{n.title}</span>
                        {n.body && <span className="block text-stone-600 dark:text-stone-400">{n.body}</span>}
                        <span className="block text-xs text-stone-400">{ago(n.createdAt)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
