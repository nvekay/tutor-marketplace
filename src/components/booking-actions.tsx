'use client';

import { Star } from 'lucide-react';
import { useState, useTransition } from 'react';
import { cancelLesson, reportLessonProblem, reviewLesson } from '@/app/actions/lessons';
import type { BookingItem } from '@/lib/bookings/queries';
import { inputClass } from './ui/field';
import { Button } from './ui/button';
import { useToast } from './ui/toast';

type Panel = 'cancel' | 'report' | 'review' | null;

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Buttons on a lesson row (cancel, report a problem, review) with an inline form below the row */
export function BookingActions({ item, perspective }: { item: BookingItem; perspective: 'student' | 'tutor' }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const open = (p: Panel) => {
    setText('');
    setPanel(panel === p ? null : p);
  };
  const submit = (action: () => Promise<{ error?: string; ok?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.ok ?? 'Done');
        setPanel(null);
      }
    });

  const buttons = [
    item.cancelRefundCents !== null && { key: 'cancel' as const, label: 'Cancel' },
    item.canReport && { key: 'report' as const, label: 'Report a problem' },
    item.canReview && { key: 'review' as const, label: 'Leave a review' },
  ].filter(Boolean) as { key: Exclude<Panel, null>; label: string }[];
  if (buttons.length === 0) return null;

  return (
    <>
      <div className="flex gap-1">
        {buttons.map((b) => (
          <Button
            key={b.key}
            size="sm"
            variant={b.key === 'cancel' ? 'danger' : 'ghost'}
            aria-expanded={panel === b.key}
            onClick={() => open(b.key)}
          >
            {b.label}
          </Button>
        ))}
      </div>

      {panel && (
        <div className="animate-fade-in basis-full rounded-lg bg-stone-50 p-3 dark:bg-stone-900">
          {panel === 'cancel' && (
            <>
              <p className="text-sm">
                {perspective === 'tutor'
                  ? `The student gets a full refund (${usd(item.cancelRefundCents!)}). Cancelling often affects how students see you.`
                  : item.lateCancellation
                    ? `Less than 24 hours before the lesson: you get ${usd(item.cancelRefundCents!)} back (50%). The tutor keeps the rest for the reserved time.`
                    : `You get the full ${usd(item.cancelRefundCents!)} back to your card.`}
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Reason (optional)"
                aria-label="Reason for cancelling"
                className={`${inputClass} mt-2`}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={pending}
                  onClick={() => submit(() => cancelLesson(item.id, text))}
                >
                  Cancel lesson
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Keep it
                </Button>
              </div>
            </>
          )}

          {panel === 'report' && (
            <>
              <p className="text-sm">
                Tell us what went wrong. The tutor isn’t paid until an admin reviews it, and you may get a refund.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. The tutor didn’t show up"
                aria-label="What went wrong"
                className={`${inputClass} mt-2`}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={pending}
                  disabled={text.trim().length < 10}
                  onClick={() => submit(() => reportLessonProblem(item.id, text))}
                >
                  Send report
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Never mind
                </Button>
              </div>
            </>
          )}

          {panel === 'review' && (
            <>
              <div className="flex gap-0.5" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    className="rounded p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`size-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-600'}`}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="What was good? (optional)"
                aria-label="Review"
                className={`${inputClass} mt-2`}
              />
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={pending}
                  onClick={() => submit(() => reviewLesson(item.id, rating, text))}
                >
                  Post review
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
