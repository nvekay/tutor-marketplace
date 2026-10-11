export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition hover:border-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (ok) return <p className="text-sm text-emerald-700 dark:text-emerald-400">{ok}</p>;
  return null;
}
