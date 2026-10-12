import type { Metadata } from 'next';
import { listStripeEvents } from '@/lib/admin';

export const metadata: Metadata = { title: 'Webhooks · Admin · Tutor Market' };

const stamp = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export default async function AdminEventsPage() {
  const events = await listStripeEvents();
  return (
    <div>
      <h1 className="text-3xl font-semibold">Stripe webhooks</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Every event is stored by its id before it is handled, so a redelivered event is recognised and skipped.
      </p>
      {events.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-700">
          No webhook events received yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900">
              <tr>
                <th className="px-3 py-2 font-medium">Received (UTC)</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium">Event id</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{stamp.format(new Date(e.received_at))}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.type}</td>
                  <td className="px-3 py-2 text-xs">
                    {e.error ? (
                      <span className="text-red-600 dark:text-red-400" title={e.error}>
                        Failed: {e.error.slice(0, 80)}
                      </span>
                    ) : e.processed_at ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Handled</span>
                    ) : (
                      <span className="text-stone-500">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-stone-500">{e.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
