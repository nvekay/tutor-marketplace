import 'server-only';
import { cookies } from 'next/headers';
import { getViewer } from './auth';

export const TZ_COOKIE = 'tz';

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Time zone to show times in: the profile's for signed-in users, the browser's (cookie) for guests */
export async function viewerTimezone(): Promise<string> {
  const viewer = await getViewer();
  if (viewer) return viewer.timezone;
  const fromBrowser = (await cookies()).get(TZ_COOKIE)?.value;
  return fromBrowser && isValidTimezone(fromBrowser) ? fromBrowser : 'UTC';
}
