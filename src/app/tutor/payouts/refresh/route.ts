// Stripe sends the tutor here when an onboarding link expired or was already used: make a fresh one.
import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
import { onboardingLink } from '@/lib/payments/connect';

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'tutor') return NextResponse.redirect(new URL('/login', request.url));

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('stripe_account_id').eq('profile_id', viewer.id).single();
  if (!data?.stripe_account_id) return NextResponse.redirect(new URL('/tutor#payouts', request.url));
  try {
    return NextResponse.redirect(await onboardingLink(data.stripe_account_id));
  } catch (e) {
    console.error('onboarding link failed', e);
    return NextResponse.redirect(new URL('/tutor?payouts=error#payouts', request.url));
  }
}
