import Image from 'next/image';

const SIZES = {
  xs: { box: 'size-8 text-xs', px: 32 },
  sm: { box: 'size-10 text-sm', px: 40 },
  md: { box: 'size-14 text-base', px: 56 },
  lg: { box: 'size-28 text-3xl', px: 112 },
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Profile photo when there is one, otherwise initials on a neutral square */
export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { box, px } = SIZES[size];
  if (src)
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={`shrink-0 rounded-lg object-cover ${box} ${className}`}
      />
    );
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-stone-100 font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300 ${box} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
