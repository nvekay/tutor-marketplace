import 'server-only';
import Stripe from 'stripe';
import { env } from '../env';

let client: Stripe | undefined;

/** Platform Stripe client (test mode only: env() rejects live keys) */
export function stripe(): Stripe {
  if (client) return client;
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error('Payments are not configured: set STRIPE_SECRET_KEY');
  client = new Stripe(key, { appInfo: { name: 'tutor-marketplace' }, maxNetworkRetries: 2 });
  return client;
}

export const paymentsConfigured = () => Boolean(env().STRIPE_SECRET_KEY);
