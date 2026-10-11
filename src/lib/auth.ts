import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Database } from './db/database.types';
import { createSupabaseServerClient } from './db/server';

export type Role = Database['public']['Enums']['user_role'];

export interface Viewer {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  timezone: string;
  isDemo: boolean;
}

/** The signed-in user with their profile, or null. Cached for the duration of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, timezone, is_demo')
    .eq('id', user.id)
    .single();
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile.role,
    fullName: profile.full_name,
    timezone: profile.timezone,
    isDemo: profile.is_demo,
  };
});

/** For pages that need a signed-in user (optionally with a given role); others are sent to sign in */
export async function requireViewer(role?: Role): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (role && viewer.role !== role) redirect('/');
  return viewer;
}

/** Only same-site paths are accepted as a place to return to after signing in ("/x", not "//evil.com") */
export const safeNext = (next: unknown): string | null =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;

/** Where each role lands after signing in */
export const homeFor = (role: Role) => (role === 'tutor' ? '/tutor' : role === 'admin' ? '/admin' : '/dashboard');
