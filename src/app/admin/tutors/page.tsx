import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listTutorAccounts, stripeDashboardUrl } from '@/lib/admin';
import { formatUsd } from '@/lib/tutors';

export const metadata: Metadata = { title: 'Tutors · Admin · Tutor Market' };

const yes =
  'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
const no = 'rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400';

export default async function AdminTutorsPage() {
  const tutors = await listTutorAccounts();
  return (
    <div>
      <h1 className="text-3xl font-semibold">Tutors and Stripe accounts</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        A tutor is listed once Stripe enables transfers to their account and the profile is filled in.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900">
            <tr>
              <th className="px-3 py-2 font-medium">Tutor</th>
              <th className="px-3 py-2 font-medium">Listed</th>
              <th className="px-3 py-2 font-medium">Transfers</th>
              <th className="px-3 py-2 font-medium">Bank payouts</th>
              <th className="px-3 py-2 font-medium">Stripe needs</th>
              <th className="px-3 py-2 font-medium">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {tutors.map((t) => (
              <tr key={t.profile_id} className="transition-colors hover:bg-stone-50 dark:hover:bg-stone-900">
                <td className="px-3 py-2">
                  <Link href={`/tutors/${t.profile_id}`} className="font-medium hover:text-accent">
                    {t.profiles?.full_name || 'Unnamed'}
                  </Link>
                  {t.profiles?.is_demo && <span className="ml-1.5 text-xs text-stone-400">demo</span>}
                  <p className="text-xs text-stone-500">
                    {formatUsd(t.hourly_rate_cents)}/h
                    {t.rating_avg && ` · ★ ${Number(t.rating_avg).toFixed(1)} (${t.rating_count})`}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <span className={t.listed ? yes : no}>{t.listed ? 'Yes' : 'No'}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={t.transfers_enabled ? yes : no}>{t.transfers_enabled ? 'Active' : 'Off'}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={t.payouts_enabled ? yes : no}>{t.payouts_enabled ? 'Active' : 'Off'}</span>
                </td>
                <td className="px-3 py-2 text-xs text-stone-600 dark:text-stone-400">
                  {t.stripe_requirements.length ? t.stripe_requirements.join(', ') : '—'}
                </td>
                <td className="px-3 py-2">
                  {t.stripe_account_id ? (
                    <a
                      href={stripeDashboardUrl(t.stripe_account_id) ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                    >
                      {t.stripe_account_id} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">not created</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
