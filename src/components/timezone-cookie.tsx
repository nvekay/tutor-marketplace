'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Tells the server the browser's time zone, so guests see lesson times in their own time */
export function TimezoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.match(/(?:^|;\s*)tz=([^;]+)/)?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    // Re-render server components that already used the UTC fallback
    router.refresh();
  }, [router]);
  return null;
}
