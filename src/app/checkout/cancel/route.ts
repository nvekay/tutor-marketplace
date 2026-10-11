// The student pressed "back" on Stripe Checkout: release the held slot right away and return to the tutor.
import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { abandonCheckout } from '@/lib/bookings/service';

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL('/login', request.url));

  const bookingId = new URL(request.url).searchParams.get('booking') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.redirect(new URL('/tutors', request.url));

  try {
    const booking = await abandonCheckout(bookingId, viewer.id);
    if (!booking) return NextResponse.redirect(new URL('/tutors', request.url));
    // Paid after all (e.g. in another tab): show the confirmation instead
    if (booking.status === 'confirmed' && booking.checkout_session_id)
      return NextResponse.redirect(new URL(`/checkout/success?session_id=${booking.checkout_session_id}`, request.url));
    return NextResponse.redirect(new URL(`/tutors/${booking.tutor_id}?checkout=cancelled`, request.url));
  } catch (e) {
    console.error('abandon checkout failed', e);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
