import { ArrowRight, CalendarCheck, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const MONEY_FLOW = [
  {
    icon: CalendarCheck,
    title: 'Book a slot',
    text: 'Pick a time in your own time zone. The slot is held for 30 minutes while you pay.',
  },
  {
    icon: CreditCard,
    title: 'Pay upfront',
    text: 'Stripe Checkout charges the platform account. The tutor isn’t paid yet.',
  },
  {
    icon: ShieldCheck,
    title: 'Money is held',
    text: 'Until the lesson ends plus 24 hours to report a problem. Cancel early and you get it back.',
  },
  {
    icon: Landmark,
    title: 'Tutor gets paid',
    text: 'A Stripe Connect transfer sends the price minus the platform fee to the tutor.',
  },
];

const TRY = [
  {
    role: 'Student',
    steps: [
      'Pick a tutor and a time, pay with the test card',
      'Cancel more than 24 h ahead: full refund; later: 50%',
      'After a lesson: leave a review or report a problem',
    ],
  },
  {
    role: 'Tutor',
    steps: [
      'Set your weekly hours and days off',
      'See booked lessons and what you earn on each',
      'Sign up as a new tutor to go through Stripe onboarding',
    ],
  },
  {
    role: 'Admin',
    steps: [
      'Follow every booking’s money in a timeline linked to Stripe',
      'Resolve a complaint with a full, partial or no refund',
      'Skip ahead in time to see the tutor paid out',
    ],
  },
];

const HIGHLIGHTS = [
  'Double bookings are impossible: a Postgres exclusion constraint rejects overlapping lessons, even under races.',
  'Every Stripe call that moves money has an idempotency key; webhooks are stored by event id and handled once.',
  'Transfers to tutors are tied to the student’s charge, so a payout can never exceed what was collected.',
  'Chargebacks hold the payout, or reverse the transfer if the tutor was already paid.',
  'Slot times are computed in each person’s time zone and tested across daylight saving changes.',
  'Row level security: users only ever read their own lessons; money moves only on the server.',
];

const STACK = ['Next.js', 'TypeScript', 'Supabase (Postgres, Auth, RLS)', 'Stripe Connect', 'Tailwind CSS'];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24">
        <p className="text-sm font-medium text-accent">Demo project · Marketplace with escrow payments</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Book a lesson, pay upfront. The tutor is paid after it happens.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          A tutor marketplace where payments are held by the platform until the lesson takes place, with cancellations,
          refunds and disputes handled by clear rules.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Find a tutor
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Try as student, tutor or admin
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Stripe test mode: pay with card <span className="font-mono">4242 4242 4242 4242</span>, any future date and
          CVC. No real money moves.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold">How the money moves</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MONEY_FLOW.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="size-4 text-slate-400" aria-hidden />
                </div>
                <p className="mt-2 font-medium">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-xl font-semibold">Try it</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {TRY.map((t) => (
            <div key={t.role} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="font-medium">As a {t.role.toLowerCase()}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {t.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-xl font-semibold">Under the hood</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm text-slate-600 md:grid-cols-2 dark:text-slate-400">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-semibold">Stack</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {STACK.map((s) => (
            <li key={s} className="rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">
              {s}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
