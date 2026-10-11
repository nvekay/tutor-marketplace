import { CircleCheck, CircleDashed, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { BookingList } from '@/components/booking-list';
import { requireViewer } from '@/lib/auth';
import { listMyBookings } from '@/lib/bookings/queries';
import { env } from '@/lib/env';
import { paymentsConfigured } from '@/lib/payments/stripe';
import { getMyTutorProfile, onboardingSteps, type MyTutorProfile } from '@/lib/tutor-account';
import { openStripeDashboard, refreshPayoutStatus, startPayoutOnboarding } from './actions';

export const metadata: Metadata = { title: 'Tutor dashboard · Tutor Market' };

const RETURN_MESSAGES: Record<string, { tone: 'ok' | 'warn' | 'error'; text: string }> = {
  active: { tone: 'ok', text: 'Payouts are set up. You can now receive bookings.' },
  pending: { tone: 'warn', text: 'Stripe still needs a few details before you can be paid. Continue the setup below.' },
  error: { tone: 'error', text: 'We couldn’t check your Stripe account. Use “Refresh status” in a moment.' },
};

export default async function TutorDashboardPage({ searchParams }: { searchParams: Promise<{ payouts?: string }> }) {
  const viewer = await requireViewer('tutor');
  const [tutor, bookings] = await Promise.all([getMyTutorProfile(viewer), listMyBookings(viewer)]);
  const steps = onboardingSteps(tutor);
  const returned = RETURN_MESSAGES[(await searchParams).payouts ?? ''];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {tutor.fullName.split(' ')[0] || 'there'}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Times are shown in {tutor.timezone}.</p>
        </div>
        {tutor.listed ? (
          <Link
            href={`/tutors/${tutor.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <Eye className="size-4" aria-hidden /> Listed in search
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <EyeOff className="size-4" aria-hidden /> Not listed yet
          </span>
        )}
      </div>

      {returned && (
        <p
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            returned.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : returned.tone === 'warn'
                ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {returned.text}
        </p>
      )}

      <section aria-labelledby="steps-title" className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <h2 id="steps-title" className="font-medium">
          {steps.every((s) => s.done) ? 'You’re all set' : 'Get ready to teach'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Students find you once your profile, hours and payouts are ready.
        </p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition hover:border-accent/60 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                {step.done ? (
                  <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-label="Done" />
                ) : (
                  <CircleDashed className="size-5 shrink-0 text-slate-400" aria-label="To do" />
                )}
                <span>
                  <span className="block text-xs text-slate-500">Step {i + 1}</span>
                  {step.label}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="lessons-title">
        <h2 id="lessons-title" className="mb-3 font-medium">
          Upcoming lessons
        </h2>
        <BookingList
          items={bookings.upcoming}
          timezone={tutor.timezone}
          perspective="tutor"
          empty={
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No upcoming lessons yet. They appear here as soon as a student pays.
            </p>
          }
        />
      </section>

      <PayoutsCard tutor={tutor} />
    </div>
  );
}

function PayoutsCard({ tutor }: { tutor: MyTutorProfile }) {
  const feePercent = env().PLATFORM_FEE_BPS / 100;
  return (
    <section
      id="payouts"
      aria-labelledby="payouts-title"
      className="scroll-mt-20 rounded-xl border border-slate-200 p-5 dark:border-slate-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="payouts-title" className="font-medium">
          Payouts
        </h2>
        <PayoutBadge tutor={tutor} />
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Students pay when they book. The money is held by the platform until the lesson is over and the 24-hour
        complaint window has passed, then your share ({100 - feePercent}% of the price) is sent to your Stripe account.
      </p>

      {!paymentsConfigured() ? (
        <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">Payments are not configured on this server.</p>
      ) : !tutor.stripeAccountId ? (
        <div className="mt-4 flex flex-col items-start gap-2">
          <ActionButton variant="primary" action={startPayoutOnboarding}>
            Set up payouts with Stripe
          </ActionButton>
          <p className="text-xs text-slate-500">
            Test mode: Stripe’s onboarding offers test data, so you don’t need real documents or a bank account.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {tutor.stripeRequirements.length > 0 && (
            <div className="text-sm">
              <p className="text-slate-600 dark:text-slate-400">Stripe still needs:</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {tutor.stripeRequirements.map((r) => (
                  <li
                    key={r}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    {requirementLabel(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!tutor.transfersEnabled && !tutor.isDemo && (
              <ActionButton variant="primary" action={startPayoutOnboarding}>
                Continue setup
              </ActionButton>
            )}
            {tutor.isDemo ? (
              <p className="text-sm text-slate-500">
                The demo tutor’s Stripe account is managed by the platform (no Stripe dashboard).
              </p>
            ) : (
              <ActionButton action={openStripeDashboard}>
                <ExternalLink className="size-4" aria-hidden /> Stripe dashboard
              </ActionButton>
            )}
            <ActionButton variant="ghost" action={refreshPayoutStatus}>
              <RefreshCw className="size-4" aria-hidden /> Refresh status
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  );
}

function PayoutBadge({ tutor }: { tutor: MyTutorProfile }) {
  if (tutor.transfersEnabled)
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        Active{tutor.payoutsEnabled ? '' : ' · bank payouts not set up'}
      </span>
    );
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {tutor.stripeAccountId ? 'Setup in progress' : 'Not set up'}
    </span>
  );
}

/** "individual.address.line1" → "Individual address line1" */
const requirementLabel = (r: string) =>
  r
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
