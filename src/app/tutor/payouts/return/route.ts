// Stripe sends the tutor here after onboarding. Finishing (or leaving) onboarding doesn't mean the
// account is ready, so we read its status from Stripe instead of trusting the redirect.
import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';
import { syncConnectedAccount } from '@/lib/payments/connect';

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'tutor') return NextResponse.redirect(new URL('/login', request.url));

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tutors').select('stripe_account_id').eq('profile_id', viewer.id).single();
  let result = 'pending';
  if (data?.stripe_account_id) {
    try {
      const status = await syncConnectedAccount(data.stripe_account_id);
      if (status?.transfersEnabled) result = 'active';
    } catch (e) {
      console.error('payout status sync failed', e);
      result = 'error';
    }
  }
  return NextResponse.redirect(new URL(`/tutor?payouts=${result}#payouts`, request.url));
}
