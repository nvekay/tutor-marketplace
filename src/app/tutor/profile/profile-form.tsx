'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormMessage, inputClass } from '@/components/ui/field';
import { saveProfile } from '../actions';

interface ProfileValues {
  fullName: string;
  timezone: string;
  headline: string;
  bio: string;
  subjects: string[];
  hourlyRateUsd: number;
  lessonMinutes: number;
  isDemo: boolean;
}

export function ProfileForm({ tutor, timezones }: { tutor: ProfileValues; timezones: string[] }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const [rate, setRate] = useState(tutor.hourlyRateUsd);
  const [minutes, setMinutes] = useState(tutor.lessonMinutes);
  const lessonPrice = Math.round(rate * minutes) / 60;

  return (
    <form action={action} className="mt-6 flex max-w-2xl flex-col gap-4">
      {tutor.isDemo && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          You’re in the shared demo tutor account: you can look around, but the public profile can’t be changed.
        </p>
      )}
      <fieldset disabled={tutor.isDemo || pending} className="contents">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input name="fullName" defaultValue={tutor.fullName} required className={inputClass} />
          </Field>
          <Field label="Time zone" hint="Your weekly hours are in this time zone">
            <select name="timezone" defaultValue={tutor.timezone} className={inputClass}>
              {timezones.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Headline" hint="One line that tells students what you help with">
          <input
            name="headline"
            defaultValue={tutor.headline}
            required
            maxLength={120}
            placeholder="e.g. Conversational Spanish from day one"
            className={inputClass}
          />
        </Field>
        <Field label="Subjects" hint="Separated by commas, up to 8">
          <input
            name="subjects"
            defaultValue={tutor.subjects.join(', ')}
            required
            placeholder="e.g. Spanish, DELE exam"
            className={inputClass}
          />
        </Field>
        <Field label="About you">
          <textarea
            name="bio"
            defaultValue={tutor.bio}
            rows={5}
            maxLength={2000}
            placeholder="Your experience, how your lessons work, who they’re for"
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hourly rate, USD">
            <input
              name="hourlyRateUsd"
              type="number"
              min={5}
              max={500}
              step={1}
              required
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Lesson length">
            <select
              name="lessonMinutes"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={inputClass}
            >
              {[30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Students pay <strong className="text-stone-900 dark:text-stone-100">${lessonPrice.toFixed(2)}</strong> per{' '}
          {minutes}-minute lesson.
        </p>
      </fieldset>
      <FormMessage error={state.error} ok={state.ok} />
      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={tutor.isDemo}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
