import 'server-only';
import type { Json } from '../db/database.types';
import { createSupabaseAdminClient } from '../db/admin';

interface IncomingEvent {
  id: string;
  type: string;
  livemode: boolean;
  payload: unknown;
}

/**
 * Runs a webhook handler at most once per Stripe event id.
 * The event is stored before handling; a redelivered event that was already handled is skipped,
 * one that failed last time is handled again (Stripe retries failed deliveries for up to 3 days).
 */
export async function handleOnce(event: IncomingEvent, handler: () => Promise<void>): Promise<'handled' | 'duplicate'> {
  const db = createSupabaseAdminClient();
  const { error: insertError } = await db.from('stripe_events').insert({
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    payload: event.payload as NonNullable<Json>,
  });
  if (insertError) {
    if (insertError.code !== '23505') throw new Error(`Could not store event: ${insertError.message}`);
    const { data } = await db.from('stripe_events').select('processed_at').eq('id', event.id).single();
    if (data?.processed_at) return 'duplicate';
  }

  try {
    await handler();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from('stripe_events').update({ error: message }).eq('id', event.id);
    throw e;
  }
  await db.from('stripe_events').update({ processed_at: new Date().toISOString(), error: null }).eq('id', event.id);
  return 'handled';
}
