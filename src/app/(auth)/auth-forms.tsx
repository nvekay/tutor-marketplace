'use client';

import { BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useState, useSyncExternalStore, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { signIn, signInAsDemo, signUp, type AuthState } from './actions';

const noopSubscribe = () => () => {};

function ErrorText({ state }: { state: AuthState }) {
  return state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null;
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email">
        <input name="email" type="email" required autoComplete="username" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <ErrorText state={state} />
      <Button type="submit" variant="primary" loading={pending}>
        Sign in
      </Button>
      <p className="text-center text-sm text-slate-500">
        New here?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

const DEMO_ROLES = [
  { role: 'student', label: 'Student', hint: 'Find a tutor and book a lesson', icon: BookOpen },
  { role: 'tutor', label: 'Tutor', hint: 'Schedule, bookings and earnings', icon: GraduationCap },
  { role: 'admin', label: 'Admin', hint: 'Payments, payouts and disputes', icon: ShieldCheck },
] as const;

/** One click into a shared demo account, so visitors can try every side of the marketplace */
export function DemoSignIn({ next }: { next?: string }) {
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Try the demo without signing up</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {DEMO_ROLES.map(({ role, label, hint, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={pendingRole !== null}
            onClick={() => {
              setPendingRole(role);
              startTransition(async () => {
                const result = await signInAsDemo(role, next);
                setError(result?.error);
                setPendingRole(null);
              });
            }}
            className="group rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-px hover:border-accent hover:shadow-sm disabled:pointer-events-none disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <Icon className="size-4 text-accent" aria-hidden />
            <span className="mt-1.5 block text-sm font-medium">
              {pendingRole === role ? 'Signing in…' : `As a ${label.toLowerCase()}`}
            </span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function SignUpForm({ defaultRole }: { defaultRole: 'student' | 'tutor' }) {
  const [state, action, pending] = useActionState(signUp, {});
  const [role, setRole] = useState(defaultRole);
  // The browser knows the user's time zone (lesson times are shown in it); the server renders UTC
  const timezone = useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => 'UTC',
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I want to">
        {(['student', 'tutor'] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`rounded-xl border p-3 text-left text-sm transition-colors ${
              role === r
                ? 'border-accent bg-accent-soft dark:bg-slate-900'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <span className="block font-medium">{r === 'student' ? 'I want to learn' : 'I want to teach'}</span>
            <span className="text-xs text-slate-500">
              {r === 'student' ? 'Book lessons, pay securely' : 'Set your hours, get paid after each lesson'}
            </span>
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="timezone" value={timezone} />
      <Field label="Full name">
        <input name="fullName" required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Password (8+ characters)">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-slate-500">Time zone: {timezone}</p>
      <ErrorText state={state} />
      <Button type="submit" variant="primary" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
