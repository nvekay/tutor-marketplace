'use server';

import { revalidatePath } from 'next/cache';
import { requireViewer } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/db/server';

export async function markNotificationsRead(): Promise<void> {
  const viewer = await requireViewer();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', viewer.id)
    .is('read_at', null);
  revalidatePath('/', 'layout');
}
