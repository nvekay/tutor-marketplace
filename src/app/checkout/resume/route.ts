// "Pay now" for a held slot: back to the same Stripe Checkout session while it is still open.
import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/db/admin';
import { stripe } from '@/lib/payments/stripe';

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL('/login', request.url));

  const bookingId = new URL(request.url).searchParams.get('booking') ?? '';
  const { data: booking } = await createSupabaseAdminClient()
    .from('bookings')
    .select('student_id, tutor_id, status, checkout_session_id')
    .eq('id', /^[0-9a-f-]{36}$/i.test(bookingId) ? bookingId : '00000000-0000-0000-0000-000000000000')
    .maybeSingle();
  if (!booking || booking.student_id !== viewer.id) return NextResponse.redirect(new URL('/dashboard', request.url));

  if (booking.status === 'pending_payment' && booking.checkout_session_id) {
    const session = await stripe().checkout.sessions.retrieve(booking.checkout_session_id);
    if (session.status === 'open' && session.url) return NextResponse.redirect(session.url);
    if (session.status === 'complete')
      return NextResponse.redirect(new URL(`/checkout/success?session_id=${session.id}`, request.url));
  }
  // The hold is gone: pick a time again
  return NextResponse.redirect(new URL(`/tutors/${booking.tutor_id}`, request.url));
}
