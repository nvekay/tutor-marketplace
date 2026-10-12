// Initials on a warm colour picked from the name, so each tutor keeps the same colour everywhere
const PALETTE = [
  'bg-[#f4dccf] text-[#9a4a2b] dark:bg-[#3b2820] dark:text-[#f0bfa4]', // terracotta
  'bg-[#dce8da] text-[#3f6b45] dark:bg-[#22322a] dark:text-[#a9d3b0]', // sage
  'bg-[#f5e6c4] text-[#8a6114] dark:bg-[#382d17] dark:text-[#ecca7f]', // ochre
  'bg-[#eadce8] text-[#76406f] dark:bg-[#33242f] dark:text-[#ddb2d6]', // plum
  'bg-[#dce4ee] text-[#3d5a80] dark:bg-[#212b38] dark:text-[#adc2df]', // dusk blue
  'bg-[#f6dde0] text-[#9b3e4c] dark:bg-[#3a2226] dark:text-[#eeb1ba]', // rose
];

const SIZES = {
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-20 text-2xl',
};

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-semibold ${SIZES[size]} ${PALETTE[hash(name) % PALETTE.length]}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
