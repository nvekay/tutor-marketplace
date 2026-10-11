import { CircleCheck, Clock, Undo2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { confirmFromCheckout } from '@/lib/bookings/service';
import { createSupabaseAdminClient } from '@/lib/db/admin';
import { stripe } from '@/lib/payments/stripe';
import { formatUsd } from '@/lib/tutors';

export const metadata: Metadata = { title: 'Booking · Tutor Market' };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const viewer = await requireViewer();
  const sessionId = (await searchParams).session_id;
  if (!sessionId?.startsWith('cs_')) notFound();

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    notFound();
  }
  const bookingId = session.metadata?.booking_id;
  const db = createSupabaseAdminClient();
  const { data: owner } = await db
    .from('bookings')
    .select('student_id')
    .eq('id', bookingId ?? '')
    .maybeSingle();
  if (!owner || owner.student_id !== viewer.id) notFound();

  // Usually the webhook got here first; if not, the payment is recorded now (same idempotent code path)
  const booking = await confirmFromCheckout(session);
  if (!booking) notFound();
  const { data: tutor } = await db.from('profiles').select('full_name').eq('id', booking.tutor_id).single();

  const when = new Date(booking.starts_at).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: viewer.timezone,
    timeZoneName: 'short',
  });

  const state =
    booking.status === 'confirmed'
      ? {
          icon: <CircleCheck className="size-10 text-emerald-600" aria-hidden />,
          title: 'You’re booked',
          text: `Your lesson with ${tutor?.full_name} is confirmed. The payment is held by the platform and reaches your tutor only after the lesson.`,
        }
      : booking.status === 'cancelled'
        ? {
            icon: <Undo2 className="size-10 text-amber-600" aria-hidden />,
            title: 'Payment refunded',
            text: 'The time was booked by someone else while you were paying, so we refunded you in full.',
          }
        : {
            icon: <Clock className="size-10 text-slate-400" aria-hidden />,
            title: 'Payment is processing',
            text: 'We’ll confirm your lesson as soon as Stripe confirms the payment. You can close this page.',
          };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
      <div className="animate-fade-in rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-800">
        <div className="flex justify-center">{state.icon}</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{state.title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{state.text}</p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-900">
          <dt className="text-slate-500">Tutor</dt>
          <dd>{tutor?.full_name}</dd>
          <dt className="text-slate-500">When</dt>
          <dd>{when}</dd>
          <dt className="text-slate-500">Paid</dt>
          <dd>
            {formatUsd(booking.price_cents)}
            {booking.refunded_cents > 0 && ` (refunded ${formatUsd(booking.refunded_cents)})`}
          </dd>
        </dl>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            My lessons
          </Link>
          <Link
            href="/tutors"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Find another tutor
          </Link>
        </div>
      </div>
    </main>
  );
}
