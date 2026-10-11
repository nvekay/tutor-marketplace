import { ArrowRight, CalendarCheck, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const MONEY_FLOW = [
  {
    icon: CalendarCheck,
    title: 'Book a slot',
    text: 'Pick a time in your own time zone. The slot is held for 15 minutes while you pay.',
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
