export const inputClass =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition hover:border-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-stone-600 dark:text-stone-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (ok) return <p className="text-sm text-emerald-700 dark:text-emerald-400">{ok}</p>;
  return null;
}
