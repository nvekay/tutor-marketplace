import 'server-only';
// Tutors get paid through Stripe Connect. Each tutor has a connected account (Accounts v2) with the
// recipient configuration: the platform charges students itself and later transfers the tutor's share.
// Stripe hosts onboarding (identity, bank account) and the Express dashboard where tutors see payouts.
import { createSupabaseAdminClient } from '../db/admin';
import { env } from '../env';
import { accountStatus, type PayoutAccountStatus } from './account-status';
import { stripe } from './stripe';

const INCLUDE = ['configuration.recipient', 'requirements'] as const;

/** Creates the tutor's connected account (once) and stores its id on the tutor row */
export async function ensureConnectedAccount(tutor: { id: string; email: string; fullName: string }): Promise<string> {
  const db = createSupabaseAdminClient();
  const { data: row, error } = await db.from('tutors').select('stripe_account_id').eq('profile_id', tutor.id).single();
  if (error) throw new Error(`Tutor not found: ${error.message}`);
  if (row.stripe_account_id) return row.stripe_account_id;

  const account = await stripe().v2.core.accounts.create(
    {
      display_name: tutor.fullName || tutor.email,
      contact_email: tutor.email,
      dashboard: 'express',
      identity: { country: 'us', entity_type: 'individual' },
      defaults: {
        currency: 'usd',
        // The platform pays Stripe fees and covers negative balances (refunds after a transfer, chargebacks)
        responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      metadata: { tutor_id: tutor.id },
    },
    // One account per tutor even if the button is clicked twice
    { idempotencyKey: `tutor:${tutor.id}:account` },
  );

  // Only set it if no other request got there first
  const { data: saved } = await db
    .from('tutors')
    .update({ stripe_account_id: account.id })
    .eq('profile_id', tutor.id)
    .is('stripe_account_id', null)
    .select('stripe_account_id')
    .maybeSingle();
  return saved?.stripe_account_id ?? account.id;
}

/** A single-use link to Stripe-hosted onboarding; Stripe sends the tutor back to /tutor/payouts/return */
export async function onboardingLink(accountId: string): Promise<string> {
  const site = env().NEXT_PUBLIC_SITE_URL;
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        refresh_url: `${site}/tutor/payouts/refresh`,
        return_url: `${site}/tutor/payouts/return`,
      },
    },
  });
  return link.url;
}

/** Sign-in link to the tutor's Stripe Express dashboard (balance, payouts, bank details) */
export async function dashboardLink(accountId: string): Promise<string> {
  const link = await stripe().accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Pulls the account's current state from Stripe and stores it on the tutor row.
 * Called on return from onboarding, from webhooks, and by the seed; safe to call any time.
 */
export async function syncConnectedAccount(accountId: string): Promise<PayoutAccountStatus | null> {
  const account = await stripe().v2.core.accounts.retrieve(accountId, { include: [...INCLUDE] });
  const status = accountStatus(account);
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('tutors')
    .update({
      transfers_enabled: account.closed ? false : status.transfersEnabled,
      payouts_enabled: account.closed ? false : status.payoutsEnabled,
      stripe_requirements: status.requirements,
      stripe_synced_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', accountId)
    .select('profile_id');
  if (error) throw new Error(`Could not save account status: ${error.message}`);
  // An account we don't know (e.g. created by hand in the Dashboard) is ignored
  return data.length > 0 ? status : null;
}
