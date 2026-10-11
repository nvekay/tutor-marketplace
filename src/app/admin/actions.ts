'use server';

import { revalidatePath } from 'next/cache';
import { requireViewer } from '@/lib/auth';
import { cancelBooking, fastForwardBooking, resolveComplaint } from '@/lib/bookings/lifecycle';
import { BookingError } from '@/lib/bookings/service';
import { runJobs, timeTravelAllowed } from '@/lib/jobs';

interface Result {
  error?: string;
  ok?: string;
}

async function asAdmin(work: (adminId: string) => Promise<string>): Promise<Result> {
  const viewer = await requireViewer('admin');
  try {
    const ok = await work(viewer.id);
    revalidatePath('/', 'layout');
    return { ok };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error('admin action failed', e);
    return { error: e instanceof Error ? e.message : 'Something went wrong' };
  }
}

export async function runJobsNow(): Promise<Result> {
  return asAdmin(async () => {
    const r = await runJobs();
    const parts = [
      r.expiredHolds && `${r.expiredHolds} holds released`,
      r.reminders && `${r.reminders} reminders`,
      r.completed && `${r.completed} lessons completed`,
      r.paidOut && `${r.paidOut} tutors paid`,
      r.payoutsFailed && `${r.payoutsFailed} payouts failed`,
    ].filter(Boolean);
    return parts.length ? `Jobs done: ${parts.join(', ')}` : 'Jobs done: nothing was due';
  });
}

export async function fastForward(bookingId: string): Promise<Result> {
  if (!timeTravelAllowed()) return { error: 'Time travel is turned off on this server' };
  return asAdmin((adminId) => fastForwardBooking(bookingId, adminId));
}

export async function cancelAsAdmin(bookingId: string, reason: string): Promise<Result> {
  return asAdmin(async (adminId) => {
    const b = await cancelBooking({ bookingId, by: 'admin', actorId: adminId, reason });
    return `Cancelled, $${(b.refunded_cents / 100).toFixed(2)} refunded`;
  });
}

export async function resolve(bookingId: string, refundCents: number, note: string): Promise<Result> {
  return asAdmin(async (adminId) => {
    const b = await resolveComplaint({ bookingId, adminId, refundCents, note });
    return b.refunded_cents > 0
      ? `Resolved: $${(b.refunded_cents / 100).toFixed(2)} refunded`
      : 'Resolved: tutor will be paid';
  });
}
