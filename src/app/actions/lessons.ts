'use server';

import { revalidatePath } from 'next/cache';
import { requireViewer } from '@/lib/auth';
import { cancelBooking, leaveReview, reportProblem } from '@/lib/bookings/lifecycle';
import { BookingError } from '@/lib/bookings/service';

interface Result {
  error?: string;
  ok?: string;
}

async function run(work: () => Promise<string>): Promise<Result> {
  try {
    const ok = await work();
    revalidatePath('/', 'layout');
    return { ok };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error('lesson action failed', e);
    return { error: 'Something went wrong with the payment provider. Please try again.' };
  }
}

/** Students and tutors cancel their own upcoming lessons; the refund follows the policy */
export async function cancelLesson(bookingId: string, reason: string): Promise<Result> {
  const viewer = await requireViewer();
  if (viewer.role === 'admin') return { error: 'Admins cancel lessons from the admin panel' };
  return run(async () => {
    const booking = await cancelBooking({
      bookingId,
      by: viewer.role,
      actorId: viewer.id,
      reason,
    });
    return booking.refunded_cents > 0
      ? `Lesson cancelled. $${(booking.refunded_cents / 100).toFixed(2)} refunded to the student’s card.`
      : 'Lesson cancelled';
  });
}

export async function reportLessonProblem(bookingId: string, reason: string): Promise<Result> {
  const viewer = await requireViewer('student');
  return run(async () => {
    await reportProblem({ bookingId, studentId: viewer.id, reason });
    return 'Thanks for letting us know. The payment to the tutor is on hold while we review it.';
  });
}

export async function reviewLesson(bookingId: string, rating: number, comment: string): Promise<Result> {
  const viewer = await requireViewer('student');
  return run(async () => {
    await leaveReview({ bookingId, studentId: viewer.id, rating, comment });
    return 'Thanks for your review';
  });
}
