const tone = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  grey: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
};

const STATUS: Record<string, [string, keyof typeof tone]> = {
  pending_payment: ['Awaiting payment', 'amber'],
  confirmed: ['Confirmed', 'blue'],
  completed: ['Completed', 'green'],
  disputed: ['Complaint', 'red'],
  cancelled: ['Cancelled', 'grey'],
  expired: ['Not paid', 'grey'],
};

const PAYOUT: Record<string, [string, keyof typeof tone]> = {
  none: ['After lesson', 'grey'],
  scheduled: ['Scheduled', 'blue'],
  held: ['On hold', 'amber'],
  paid: ['Paid', 'green'],
  reversed: ['Reversed', 'red'],
  not_due: ['Not due', 'grey'],
};

const Badge = ({ label, color }: { label: string; color: keyof typeof tone }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone[color]}`}>{label}</span>
);

export function StatusBadge({ status, chargeback = false }: { status: string; chargeback?: boolean }) {
  if (status === 'disputed' && chargeback) return <Badge label="Chargeback" color="red" />;
  const [label, color] = STATUS[status] ?? [status, 'grey'];
  return <Badge label={label} color={color} />;
}

export function PayoutBadge({ status }: { status: string }) {
  const [label, color] = PAYOUT[status] ?? [status, 'grey'];
  return <Badge label={label} color={color} />;
}
