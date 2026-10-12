/** Brand mark: a filled square with a cut corner, like a page being turned */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <path d="M4 4h20v13l-7 7H4z" className="fill-stone-900 dark:fill-white" />
      <path d="M17 24v-7h7z" className="fill-accent" />
    </svg>
  );
}

/** Mark + wordmark; the wordmark hides on the narrowest phones */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="hidden text-[22px] leading-none font-extrabold tracking-[-0.04em] min-[400px]:inline">
        tutormarket
      </span>
    </span>
  );
}
