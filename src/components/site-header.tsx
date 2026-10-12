import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { getViewer, homeFor, type Role, type Viewer } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
import { Logo } from './logo';
import { NavLink } from './nav-link';
import { NotificationBell, type NotificationView } from './notification-bell';

const HOME_LABEL = { student: 'My lessons', tutor: 'Tutor dashboard', admin: 'Admin' } as const;
const SHORT_HOME_LABEL = { student: 'Lessons', tutor: 'Dashboard', admin: 'Admin' } as const;

/** Where a notification about a booking takes each role */
const bookingHref = (role: Role, bookingId: string | null) =>
  role === 'admin' && bookingId ? `/admin/bookings/${bookingId}` : homeFor(role);

async function loadNotifications(viewer: Viewer) {
  const supabase = await createSupabaseServerClient();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, title, body, booking_id, created_at, read_at')
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', viewer.id)
      .is('read_at', null),
  ]);
  const items = (data ?? []).map<NotificationView>((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: bookingHref(viewer.role, n.booking_id),
    createdAt: n.created_at,
    unread: !n.read_at,
  }));
  return { items, unread: count ?? 0 };
}

export async function SiteHeader() {
  const viewer = await getViewer();
  const notifications = viewer ? await loadNotifications(viewer) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-paper/85 backdrop-blur-md dark:border-stone-800">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="Tutor Market home" className="flex items-center gap-2.5 whitespace-nowrap">
          <Logo />
          <span className="hidden rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-amber-800 uppercase sm:inline dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
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
              <NavLink href={homeFor(viewer.role)}>
                <span className="sm:hidden">{SHORT_HOME_LABEL[viewer.role]}</span>
                <span className="hidden sm:inline">{HOME_LABEL[viewer.role]}</span>
              </NavLink>
              {notifications && <NotificationBell items={notifications.items} unread={notifications.unread} />}
              <form action={signOut}>
                <button
                  type="submit"
                  title={`Signed in as ${viewer.fullName || viewer.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
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
                className="rounded-full bg-accent px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-accent-strong"
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
