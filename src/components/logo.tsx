/** Brand mark: a half-lit circle (a lesson "in progress") with an amber spark */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" className="fill-paper stroke-accent" strokeWidth="2.5" />
      <path d="M16 3a13 13 0 0 0 0 26Z" className="fill-accent" />
      <circle cx="23.5" cy="9.5" r="3" className="fill-amber-500" />
    </svg>
  );
}

/** Mark + serif wordmark; the wordmark hides on the narrowest phones */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="hidden font-display text-xl leading-none font-semibold tracking-tight min-[400px]:inline">
        Tutor <em className="font-medium text-accent dark:text-accent-ink">Market</em>
      </span>
    </span>
  );
}
