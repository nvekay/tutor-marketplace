import type Stripe from 'stripe';

export interface PayoutAccountStatus {
  /** The platform can transfer lesson earnings to the tutor (required to be listed) */
  transfersEnabled: boolean;
  /** Stripe can pay the tutor's balance out to their bank */
  payoutsEnabled: boolean;
  /** What Stripe still needs from the tutor, e.g. "external_account" */
  requirements: string[];
}

/** Reads what the marketplace cares about from a v2 account (retrieved with configuration.recipient + requirements) */
export function accountStatus(account: Stripe.V2.Core.Account): PayoutAccountStatus {
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
  return {
    transfersEnabled: balance?.stripe_transfers?.status === 'active',
    payoutsEnabled: balance?.payouts?.status === 'active',
    requirements: (account.requirements?.entries ?? [])
      .filter((e) => e.awaiting_action_from === 'user' && e.minimum_deadline.status !== 'eventually_due')
      .map((e) => e.description),
  };
}
