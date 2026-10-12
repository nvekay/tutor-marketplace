import { ArrowRight, ChevronRight, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { lessonPriceCents, platformFeeCents } from '@/lib/bookings/pricing';
import { env } from '@/lib/env';
import { formatUsd, getMarketplaceStats, searchTutors } from '@/lib/tutors';

const DEMO_ROLES = [
  {
    role: 'student',
    title: 'As a student',
    text: 'Find a tutor, book a time and pay with the test card. Cancel, review the lesson or report a problem.',
  },
  {
    role: 'tutor',
    title: 'As a tutor',
    text: 'Set weekly hours and days off, see booked lessons and what you earn on each. Or sign up and try Stripe onboarding.',
  },
  {
    role: 'admin',
    title: 'As an admin',
    text: 'Follow every payment in a timeline linked to Stripe, resolve complaints with a refund, pay tutors out.',
  },
];

const ENGINEERING = [
  [
    'No double bookings',
    'a Postgres exclusion constraint rejects overlapping lessons, even under concurrent checkouts.',
  ],
  [
    'Idempotent money',
    'every Stripe call that moves money has an idempotency key; each webhook is stored and handled once.',
  ],
  ['Safe payouts', 'transfers are tied to the student’s charge, so a tutor can never be paid more than was collected.'],
  ['Chargebacks', 'a dispute holds the payout, or reverses the transfer if the tutor was already paid.'],
  ['Time zones', 'slots are computed in each person’s time zone and tested across daylight saving changes.'],
  ['Row level security', 'people only ever read their own lessons; money moves only on the server.'],
];

export default async function HomePage() {
  const [stats, topRated] = await Promise.all([getMarketplaceStats(), searchTutors({ sort: 'rating' })]);
  const faces = topRated.filter((t) => t.avatarUrl).slice(0, 3);
  // The hero shows the first face, so the money example uses that tutor’s price
  const example = faces[0] ?? topRated[0];
  const price = example ? lessonPriceCents(example.hourlyRateCents, example.lessonMinutes) : 4200;
  const fee = platformFeeCents(price, env().PLATFORM_FEE_BPS);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pt-12 pb-14 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <h1 className="text-5xl leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            Find a tutor. Pay only for lessons that happen.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-stone-600 dark:text-stone-400">
            Book a one-on-one lesson and pay upfront. We hold the money until the lesson has taken place, then pay the
            tutor. If it doesn’t happen, you get it back.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/tutors"
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-3.5 text-[17px] font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Find your tutor <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/login" className="font-semibold underline underline-offset-4 hover:text-accent">
              Try the demo accounts
            </Link>
          </div>
          <p className="mt-6 text-sm text-stone-500">
            Stripe test mode: pay with{' '}
            <span className="font-mono text-stone-700 dark:text-stone-300">4242 4242 4242 4242</span>, any future date
            and CVC.
          </p>
        </div>

        {faces.length === 3 && (
          <div className="relative mx-auto grid w-full max-w-md grid-cols-[1.4fr_1fr] gap-3">
            <Image
              src={faces[0].avatarUrl!}
              alt={faces[0].fullName}
              width={200}
              height={200}
              priority
              className="row-span-2 aspect-[4/5] h-full w-full rounded-lg object-cover"
            />
            <Image
              src={faces[1].avatarUrl!}
              alt={faces[1].fullName}
              width={200}
              height={200}
              className="aspect-square w-full rounded-lg object-cover"
            />
            <Image
              src={faces[2].avatarUrl!}
              alt={faces[2].fullName}
              width={200}
              height={200}
              className="aspect-square w-full rounded-lg object-cover"
            />
            <div className="absolute -bottom-4 left-3 rounded-lg border-2 border-stone-900 bg-white px-3.5 py-2.5 shadow-lg dark:border-stone-200 dark:bg-stone-900">
              <p className="flex items-center gap-1 text-lg font-bold">
                {faces[0].ratingAvg?.toFixed(1)} <Star className="size-4 fill-current" aria-hidden />
              </p>
              <p className="text-xs text-stone-500">{faces[0].fullName}</p>
            </div>
            <div className="absolute -top-4 right-3 rounded-lg bg-accent px-3.5 py-2.5 text-white shadow-lg">
              <p className="text-lg font-bold">{formatUsd(price)} held</p>
              <p className="text-xs text-white/80">until the lesson happens</p>
            </div>
          </div>
        )}
      </section>

      {/* Numbers */}
      <section className="border-y border-stone-200 dark:border-stone-800">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 text-center sm:grid-cols-4">
          {[
            [String(stats.tutors), 'Tutors to choose from'],
            [String(stats.reviews), 'Lesson reviews'],
            [String(stats.subjects.length), 'Subjects taught'],
            [stats.averageRating ? `${stats.averageRating.toFixed(1)} ★` : '—', 'Average rating'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-3xl font-bold tracking-tight">{value}</dd>
              <dd className="mt-1 text-sm text-stone-600 dark:text-stone-400">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Subjects */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-3xl">What do you want to learn?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.subjects.slice(0, 9).map((s) => (
            <li key={s.name}>
              <Link
                href={`/tutors?subject=${encodeURIComponent(s.name)}`}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-stone-200 px-5 py-4 transition-colors hover:border-stone-900 dark:border-stone-800 dark:hover:border-stone-200"
              >
                <span>
                  <span className="block text-xl font-bold tracking-tight">{s.name} tutors</span>
                  <span className="text-sm text-stone-500">
                    {s.tutors} {s.tutors === 1 ? 'tutor' : 'tutors'}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/tutors" className="mt-4 inline-block font-semibold underline underline-offset-4 hover:text-accent">
          All {stats.subjects.length} subjects
        </Link>
      </section>

      {/* Payments */}
      <section id="payments" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16">
        <h2 className="text-3xl">How payments work</h2>
        <p className="mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
          The platform holds every payment until the lesson is done (escrow with Stripe Connect).
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg">You pay when you book</h3>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-400">
              Stripe Checkout charges the platform, not the tutor. The time is held for you while you pay.
            </p>
          </div>
          <div>
            <h3 className="text-lg">We hold it until the lesson</h3>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-400">
              Cancel 24 hours ahead for a full refund, later for half. After the lesson you have 24 hours to report a
              problem.
            </p>
          </div>
          <div>
            <h3 className="text-lg">Then the tutor is paid</h3>
            <p className="mt-2 text-[15px] text-stone-600 dark:text-stone-400">
              A Stripe transfer sends the tutor their share. Chargebacks and complaints hold the payout until resolved.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-stone-100 px-5 py-4 text-[15px] dark:bg-stone-800">
          <span className="font-semibold">Example, a {formatUsd(price)} lesson:</span>
          <span>
            <span className="font-bold">{formatUsd(price - fee)}</span> to the tutor
          </span>
          <span>
            <span className="font-bold">{formatUsd(fee)}</span> platform fee ({env().PLATFORM_FEE_BPS / 100}%)
          </span>
          <span className="text-stone-500">paid out 24 hours after the lesson</span>
        </div>
      </section>

      {/* Demo */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-3xl">Try every side of the marketplace</h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">Shared demo accounts, one click on the sign-in page.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {DEMO_ROLES.map((d) => (
            <Link
              key={d.role}
              href="/login"
              className="group rounded-lg border-2 border-stone-200 p-5 transition-colors hover:border-stone-900 dark:border-stone-800 dark:hover:border-stone-200"
            >
              <span className="flex items-center justify-between text-xl font-bold tracking-tight">
                {d.title}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-2 block text-[15px] text-stone-600 dark:text-stone-400">{d.text}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Engineering */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="rounded-lg border-2 border-stone-200 p-6 sm:p-8 dark:border-stone-800">
          <h2 className="text-2xl">Under the hood</h2>
          <p className="mt-1 text-sm text-stone-500">
            Next.js · TypeScript · Supabase (Postgres, Auth, RLS) · Stripe Connect · Tailwind CSS
          </p>
          <dl className="mt-6 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {ENGINEERING.map(([title, text]) => (
              <div key={title} className="text-[15px]">
                <dt className="inline font-bold">{title}: </dt>
                <dd className="inline text-stone-600 dark:text-stone-400">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
