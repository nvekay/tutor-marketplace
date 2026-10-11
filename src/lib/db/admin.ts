import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';
import type { Database } from './database.types';

/**
 * Service-role client: bypasses row level security. Only for server code that has already
 * checked who is asking (bookings, payments, webhooks, cron), never for code acting on user input alone.
 */
export function createSupabaseAdminClient() {
  const config = env();
  return createClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
