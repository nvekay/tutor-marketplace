'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-strong active:bg-accent-strong/90',
  secondary:
    'border border-stone-300 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white active:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-600 dark:hover:bg-stone-800',
  ghost:
    'text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
  danger:
    'text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50 dark:active:bg-red-950',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-full px-3 text-xs',
  md: 'h-11 gap-2 rounded-full px-5 text-sm',
  icon: 'size-8 rounded-full',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks clicks while an action is running */
  loading?: boolean;
}

/** One button for the whole app: consistent hover, press, focus ring, disabled and loading states */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className={size === 'sm' || size === 'icon' ? 'size-3.5' : 'size-4'} />}
      {children}
    </button>
  );
});
