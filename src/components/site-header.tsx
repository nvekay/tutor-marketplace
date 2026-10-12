import { LogIn, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-paper dark:border-stone-800">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Tutor Market home" className="flex items-center gap-2 whitespace-nowrap">
            <Logo />
            <span className="hidden rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500 sm:inline dark:bg-stone-800 dark:text-stone-400">
              DEMO
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-[15px] font-medium md:flex" aria-label="Main">
            <NavLink href="/tutors">Find tutors</NavLink>
            {!viewer && <NavLink href="/signup?role=tutor">Become a tutor</NavLink>}
            <NavLink href="/#payments">How payments work</NavLink>
          </nav>
        </div>
        <nav className="flex items-center gap-1 text-[15px] font-medium" aria-label="Account">
          <span className="md:hidden">
            <NavLink href="/tutors">Tutors</NavLink>
          </span>
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
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg border-2 border-stone-900 px-3.5 py-1.5 font-semibold transition-colors hover:bg-stone-100 dark:border-stone-200 dark:hover:bg-stone-800"
            >
              <LogIn className="size-4" aria-hidden /> Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
