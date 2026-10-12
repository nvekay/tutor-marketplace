import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { TutorCard } from '@/components/tutor-card';
import { searchTutors } from '@/lib/tutors';

const MONEY_FLOW = [
  {
    title: 'Book a time',
    text: 'Pick a slot in your own time zone. It’s held for you for 30 minutes while you pay.',
  },
  {
    title: 'Pay upfront',
    text: 'Stripe Checkout charges the platform. The tutor isn’t paid yet.',
  },
  {
    title: 'Money is held',
    text: 'Until the lesson is over, plus 24 hours to report a problem. Cancel early and it comes back to you.',
  },
  {
    title: 'Tutor gets paid',
    text: 'A Stripe Connect transfer sends the price minus a 15% platform fee to the tutor.',
  },
];

const TRY = [
  {
    role: 'Student',
    steps: [
      'Pick a tutor and a time, pay with the test card',
      'Cancel 24 h or more ahead for a full refund, later for 50%',
      'After the lesson: leave a review or report a problem',
    ],
  },
  {
    role: 'Tutor',
    steps: [
      'Set weekly hours and days off',
      'See booked lessons and what you earn on each',
      'Sign up as a new tutor to try Stripe onboarding',
    ],
  },
  {
    role: 'Admin',
    steps: [
      'Follow each booking’s money in a timeline linked to Stripe',
      'Resolve a complaint with a full, partial or no refund',
      'Skip ahead in time and watch the tutor get paid',
    ],
  },
];

const HIGHLIGHTS = [
  'Double bookings are impossible: a Postgres exclusion constraint rejects overlapping lessons, even under races.',
  'Every Stripe call that moves money has an idempotency key; webhooks are stored by event id and handled once.',
  'Transfers to tutors are tied to the student’s charge, so a payout can never exceed what was collected.',
  'Chargebacks hold the payout, or reverse the transfer if the tutor was already paid.',
  'Slot times are computed in each person’s time zone and tested across daylight saving changes.',
  'Row level security: people only ever read their own lessons; money moves only on the server.',
];

const STACK = ['Next.js', 'TypeScript', 'Supabase · Postgres · RLS', 'Stripe Connect', 'Tailwind CSS'];

export default async function HomePage() {
  const featured = (await searchTutors({ sort: 'rating' })).slice(0, 3);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 overflow-x-clip px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/60 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
            Demo marketplace · Stripe test mode
          </p>
          <h1 className="mt-5 text-5xl leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
            Learn from people who <em className="font-medium text-accent dark:text-accent-ink">love to teach.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-stone-600 dark:text-stone-400">
            Book a lesson and pay upfront. The money waits safely with the platform, and reaches your tutor only after
            the lesson has happened.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/tutors"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-card transition hover:bg-accent-strong"
            >
              Find a tutor <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="rounded-full px-5 py-3 text-sm font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-500 dark:text-stone-300"
            >
              Try as student, tutor or admin
            </Link>
          </div>
          <p className="mt-6 text-sm text-stone-500">
            Pay with <span className="font-mono text-stone-700 dark:text-stone-300">4242 4242 4242 4242</span>, any
            future date and CVC. No real money moves.
          </p>
        </div>

        <LessonTicket
          tutorName={featured[0]?.fullName ?? 'Maria Keller'}
          subject={featured[0]?.subjects[0] ?? 'Math'}
        />
      </section>

      {/* Featured tutors */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">Top-rated tutors</h2>
            <Link
              href="/tutors"
              className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-accent hover:underline dark:text-accent-ink"
            >
              All tutors <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((t) => (
              <li key={t.id}>
                <TutorCard tutor={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* How the money moves */}
      <section className="border-y border-stone-200 bg-stone-100/70 dark:border-stone-800 dark:bg-stone-900/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">How the money moves</h2>
          <p className="mt-3 max-w-xl text-stone-600 dark:text-stone-400">
            Escrow for lessons, built on Stripe Connect: the platform holds every payment until the lesson is done.
          </p>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {MONEY_FLOW.map((step, i) => (
              <li key={step.title} className="border-t-2 border-stone-900 pt-4 dark:border-stone-200">
                <p className="font-display text-5xl leading-none font-light text-accent dark:text-accent-ink">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Try it */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-semibold sm:text-4xl">Try every side of it</h2>
        <p className="mt-3 text-stone-600 dark:text-stone-400">One click on the sign-in page, no registration.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TRY.map((t) => (
            <Link
              key={t.role}
              href="/login"
              className="group rounded-3xl border border-stone-200/80 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-medium tracking-wider text-stone-500 uppercase">
                As {t.role === 'Admin' ? 'an' : 'a'}
              </p>
              <p className="font-display text-2xl font-semibold group-hover:text-accent dark:group-hover:text-accent-ink">
                {t.role.toLowerCase()}
              </p>
              <ul className="mt-4 space-y-2.5">
                {t.steps.map((step) => (
                  <li key={step} className="flex gap-2.5 text-sm text-stone-600 dark:text-stone-400">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent dark:text-accent-ink" aria-hidden />
                    {step}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section className="bg-[#173a2e] text-[#f3eee6] dark:bg-[#0f231c]">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs font-medium tracking-wider text-[#e9b872] uppercase">For the technically curious</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">Built like the money is real</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-5 md:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-3 text-[15px] leading-relaxed text-[#ddd6c9]">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#e9b872]" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
          <ul className="mt-12 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li key={s} className="rounded-full border border-white/20 px-3.5 py-1 text-sm text-[#f3eee6]">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/** The hero's illustration: one lesson and where its money is at each step */
function LessonTicket({ tutorName, subject }: { tutorName: string; subject: string }) {
  const steps = [
    { label: 'Paid by the student', amount: '$42.00', state: 'done' },
    { label: 'Held until the lesson is over', amount: '24 h window', state: 'current' },
    { label: 'Sent to the tutor', amount: '$35.70', state: 'next' },
  ] as const;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-[2rem] bg-amber-200/60 dark:bg-amber-900/30"
        aria-hidden
      />
      <div className="relative rounded-[2rem] border border-stone-200 bg-white p-6 shadow-card-hover dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-3.5">
          <Avatar name={tutorName} />
          <div>
            <p className="text-xs tracking-wider text-stone-500 uppercase">Your lesson</p>
            <p className="font-display text-xl font-semibold">
              {subject} with {tutorName.split(' ')[0]}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-between border-y border-dashed border-stone-300 py-4 text-sm dark:border-stone-700">
          <div>
            <p className="text-stone-500">When</p>
            <p className="font-medium">Tue, 10:00 – 11:00</p>
          </div>
          <div className="text-right">
            <p className="text-stone-500">Price</p>
            <p className="font-display text-lg font-semibold">$42.00</p>
          </div>
        </div>
        <ol className="mt-5 space-y-4">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full ${
                  s.state === 'done'
                    ? 'bg-accent text-white'
                    : s.state === 'current'
                      ? 'bg-amber-100 ring-2 ring-amber-500 dark:bg-amber-950'
                      : 'border-2 border-dashed border-stone-300 dark:border-stone-600'
                }`}
                aria-hidden
              >
                {s.state === 'done' && <Check className="size-3.5" />}
                {s.state === 'current' && <span className="size-2 rounded-full bg-amber-500" />}
              </span>
              <span className={`flex-1 ${s.state === 'next' ? 'text-stone-500' : ''}`}>{s.label}</span>
              <span className="font-mono text-xs text-stone-500">{s.amount}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
