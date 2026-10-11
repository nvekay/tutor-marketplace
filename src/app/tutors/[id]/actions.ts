'use server';

import { redirect } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { BookingError, createBooking } from '@/lib/bookings/service';

/** Holds the slot and sends the student to Stripe Checkout */
export async function bookLesson(tutorId: string, startsAt: string): Promise<{ error?: string }> {
  const viewer = await requireViewer('student');
  let url: string;
  try {
    url = await createBooking({
      student: { id: viewer.id, email: viewer.email, timezone: viewer.timezone },
      tutorId,
      startsAt: new Date(startsAt),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error('booking failed', e);
    return { error: 'Payments are unavailable right now. Please try again in a minute.' };
  }
  redirect(url);
}
