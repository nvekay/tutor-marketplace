'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { homeFor, safeNext } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
import { env } from '@/lib/env';

export interface AuthState {
  error?: string;
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signUpSchema = credentials.extend({
  fullName: z.string().trim().min(2, 'Enter your name').max(80),
  role: z.enum(['student', 'tutor']),
  timezone: z.string().min(1).max(64),
});

async function landAfterSignIn(next?: string | null): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  redirect(next ?? homeFor(profile?.role ?? 'student'));
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return { error: error.message === 'Invalid login credentials' ? 'Wrong email or password' : error.message };
  return landAfterSignIn(safeNext(form.get('next')));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, fullName, role, timezone } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger to create the profile (and the tutor row)
    options: { data: { full_name: fullName, role, timezone }, emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/login` },
  });
  if (error) return { error: error.message };
  // With email confirmation on (production), there is no session until the link is clicked
  if (!data.session) return { error: 'Check your inbox: we sent a link to confirm your email.' };
  return landAfterSignIn();
}

const DEMO_ACCOUNTS = {
  student: 'student@demo.example.com',
  tutor: 'tutor@demo.example.com',
  admin: 'admin@demo.example.com',
} as const;

/** "Try as student / tutor / admin": shared public demo accounts (the admin one is read-only) */
export async function signInAsDemo(role: keyof typeof DEMO_ACCOUNTS, next?: string): Promise<AuthState> {
  const password = env().DEMO_PASSWORD;
  if (!password) return { error: 'Demo accounts are not configured' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_ACCOUNTS[role], password });
  if (error) return { error: 'The demo account is not available right now' };
  return landAfterSignIn(safeNext(next));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
