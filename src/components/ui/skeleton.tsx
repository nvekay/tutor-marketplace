/** Placeholder block shown while data loads, sized like the content it stands in for */
export function Skeleton({ className = '' }: { className?: string }) {
  // Default corners unless the caller sets its own (e.g. rounded-full for an avatar)
  const corners = /\brounded-/.test(className) ? '' : 'rounded-md';
  return <div className={`animate-pulse bg-slate-200/80 dark:bg-slate-800 ${corners} ${className}`} aria-hidden />;
}
