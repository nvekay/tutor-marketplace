'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useState, useSyncExternalStore, useTransition } from 'react';
import { Avatar } from '@/components/avatar';
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
      <p className="text-center text-sm text-stone-500">
        New here?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

const DEMO_ROLES = [
  { role: 'student', person: 'Alex Morgan', label: 'Student', hint: 'Find a tutor, book and pay for a lesson' },
  {
    role: 'tutor',
    person: 'Maria Keller',
    photo: '/tutors/maria-keller.jpg',
    label: 'Tutor',
    hint: 'Hours, booked lessons and earnings',
  },
  { role: 'admin', person: 'Demo Admin', label: 'Admin', hint: 'Payments, payouts, complaints' },
] as const;

/** One click into a shared demo account, so visitors can try every side of the marketplace */
export function DemoSignIn({ next }: { next?: string }) {
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-stone-600 dark:text-stone-400">Try the demo, no sign-up needed</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {DEMO_ROLES.map(({ role, person, label, hint, ...rest }) => (
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
            className="group flex flex-col rounded-lg border-2 border-stone-200 bg-white p-5 text-left transition-colors hover:border-stone-900 disabled:pointer-events-none disabled:opacity-60 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-200"
          >
            <span className="flex items-center justify-between">
              <Avatar name={person} src={'photo' in rest ? rest.photo : null} size="sm" />
              <ArrowRight
                className="size-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-stone-900 dark:group-hover:text-white"
                aria-hidden
              />
            </span>
            <span className="mt-4 text-lg leading-tight font-bold tracking-tight">
              {pendingRole === role ? 'Signing in…' : `As ${role === 'admin' ? 'an' : 'a'} ${label.toLowerCase()}`}
            </span>
            <span className="mt-1 text-xs text-stone-500">{hint}</span>
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
            className={`rounded-lg border-2 p-4 text-left text-sm transition-colors ${
              role === r
                ? 'border-stone-900 dark:border-stone-200'
                : 'border-stone-200 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600'
            }`}
          >
            <span className="block font-bold">{r === 'student' ? 'I want to learn' : 'I want to teach'}</span>
            <span className="text-xs text-stone-500">
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
      <p className="text-xs text-stone-500">Time zone: {timezone}</p>
      <ErrorText state={state} />
      <Button type="submit" variant="primary" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-sm text-stone-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
