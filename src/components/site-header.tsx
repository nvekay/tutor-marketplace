import { GraduationCap, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { getViewer, homeFor, type Role, type Viewer } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          aria-label="Tutor Market home"
          className="flex items-center gap-2 font-semibold whitespace-nowrap"
        >
          <span className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-hidden>
            <GraduationCap className="size-4" />
          </span>
          {/* Icon only on the narrowest phones, so the signed-in menu fits */}
          <span className="hidden min-[400px]:inline">Tutor Market</span>
          <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent sm:inline dark:bg-slate-800 dark:text-teal-300">
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
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
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
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-white transition-colors hover:bg-accent-strong"
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
