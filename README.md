# Tutor Market

A tutor marketplace demo: students book a lesson and pay upfront, the platform holds the money until the lesson
takes place, then pays the tutor minus a platform fee. Cancellations, refunds and disputes follow clear rules.

Next.js 16 · TypeScript · Supabase (Postgres, Auth, row level security) · Stripe Connect (test mode) · Tailwind CSS

> Work in progress. Done: accounts, tutor onboarding with Stripe Connect, schedules and slot search.
> Next: booking with Stripe Checkout, refunds, payouts.

## Run locally

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
pnpm db:start        # local Supabase in Docker; prints the keys for .env.local
cp .env.example .env.local   # fill in the Supabase keys and a Stripe test key (sk_test_…)
pnpm seed            # demo accounts, 13 tutors with schedules, reviews and Stripe test accounts
pnpm dev             # http://localhost:3000
```

On `/login`, the demo buttons sign you in as a student, a tutor or a read-only admin.

Stripe webhooks locally (Stripe CLI):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --forward-thin-to localhost:3000/api/stripe/events \
  --thin-events "v2.core.account[configuration.recipient].capability_status_updated,v2.core.account[requirements].updated"
```

## How tutors get paid

- Each tutor has a Stripe connected account (**Accounts v2**, recipient configuration): the platform charges students
  itself and later transfers the tutor's share to the tutor's Stripe balance.
- New tutors go through **Stripe-hosted onboarding** (identity, bank account) and get the Stripe Express dashboard.
  A tutor is listed in search only when Stripe has enabled transfers to their account.
- The account state is never taken from a redirect: it is re-read from Stripe on return from onboarding, on webhooks
  (`account.updated` and v2 thin events) and on demand.
- Every webhook is verified by signature and stored by event id before it is handled, so a redelivered event is a no-op.
- Seeded tutors get accounts created through the API with Stripe's test identity values, so the demo works without
  anyone clicking through onboarding.

## Schedules and slots

- Tutors set weekly hours in their own time zone, plus days off and special hours for specific dates.
- Students see free slots in their time zone (profile, or the browser's for guests).
- Slot generation is a pure function with unit tests: time zones, daylight saving changes (missing and repeated hours),
  12-hour notice, 60-day horizon, existing bookings.

## Data model highlights

- **No double bookings, enforced by Postgres:** an exclusion constraint on `tstzrange(starts_at, ends_at)` per tutor
  and per student, so two simultaneous checkouts for one slot can't both succeed.
- **Lesson state and money state are separate:** `bookings.status` (pending payment, confirmed, completed, disputed,
  cancelled, expired) and `bookings.payout_status` (none, scheduled, held, paid, reversed, not due). A late cancellation
  is a cancelled lesson that still pays the tutor part of the price.
- **Row level security:** visitors see only listed tutors; students and tutors see only their own bookings; users can
  edit only harmless fields (name, time zone, tutor profile and price). Everything that moves money runs on the server.
