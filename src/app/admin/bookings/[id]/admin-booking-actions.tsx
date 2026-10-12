'use client';

import { FastForward } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { cancelAsAdmin, fastForward, resolve } from '../../actions';

interface Props {
  bookingId: string;
  priceCents: number;
  canCancel: boolean;
  canResolve: boolean;
  canFastForward: boolean;
  fastForwardLabel: string;
}

export function AdminBookingActions({
  bookingId,
  priceCents,
  canCancel,
  canResolve,
  canFastForward,
  fastForwardLabel,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [refundUsd, setRefundUsd] = useState((priceCents / 200).toFixed(2));
  const [note, setNote] = useState('');
  const toast = useToast();

  const run = (action: () => Promise<{ error?: string; ok?: string }>) =>
    startTransition(async () => {
      const r = await action();
      if (r.error) toast.error(r.error);
      else toast.success(r.ok ?? 'Done');
    });

  if (!canCancel && !canResolve && !canFastForward)
    return <p className="text-sm text-stone-500">No actions available for this booking.</p>;

  const refundCents = Math.round(Number(refundUsd) * 100);
  const refundValid = Number.isFinite(refundCents) && refundCents >= 0 && refundCents <= priceCents;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-stone-200/80 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="font-medium">Actions</h2>

      {canResolve && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-600 dark:text-stone-400">Resolve the complaint: refund the student</p>
          <div className="flex gap-1.5">
            {[0, 0.5, 1].map((share) => (
              <Button key={share} size="sm" onClick={() => setRefundUsd(((priceCents * share) / 100).toFixed(2))}>
                {share === 0 ? 'Nothing' : share === 1 ? 'All' : 'Half'}
              </Button>
            ))}
          </div>
          <label className="text-sm">
            <span className="text-stone-600 dark:text-stone-400">Refund, USD</span>
            <input
              type="number"
              min={0}
              max={priceCents / 100}
              step="0.01"
              value={refundUsd}
              onChange={(e) => setRefundUsd(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note for the record (optional)"
            aria-label="Resolution note"
            className={inputClass}
          />
          <Button
            variant="primary"
            loading={pending}
            disabled={!refundValid}
            onClick={() => run(() => resolve(bookingId, refundCents, note))}
          >
            {refundCents === 0
              ? 'Pay the tutor in full'
              : `Refund $${(refundCents / 100).toFixed(2)}, pay the tutor the rest`}
          </Button>
        </div>
      )}

      {canFastForward && (
        <div className="flex flex-col gap-1.5">
          <Button loading={pending} onClick={() => run(() => fastForward(bookingId))}>
            <FastForward className="size-4" aria-hidden /> {fastForwardLabel}
          </Button>
          <p className="text-xs text-stone-500">
            Demo shortcut instead of waiting for the lesson time and the 24 hours.
          </p>
        </div>
      )}

      {canCancel && (
        <Button
          variant="danger"
          loading={pending}
          onClick={() => {
            if (window.confirm('Cancel this lesson and refund the student in full?'))
              run(() => cancelAsAdmin(bookingId, 'Cancelled by an admin'));
          }}
        >
          Cancel with full refund
        </Button>
      )}
    </section>
  );
}
