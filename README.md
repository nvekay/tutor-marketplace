# Tutor Market

A tutor marketplace demo: students book a lesson and pay upfront, the platform holds the money until the lesson
takes place, then pays the tutor minus a platform fee. Cancellations, refunds and disputes follow clear rules.

Next.js 16 · TypeScript · Supabase (Postgres, Auth, row level security) · Stripe Connect (test mode) · Tailwind CSS

> Work in progress. Payments (Stripe Connect onboarding, Checkout, payouts) are being added.

## Run locally

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
pnpm db:start        # local Supabase in Docker; prints the keys for .env.local
cp .env.example .env.local   # fill in the Supabase keys
pnpm seed            # demo accounts, 13 tutors with schedules and reviews
pnpm dev             # http://localhost:3000
```

On `/login`, the demo buttons sign you in as a student, a tutor or a read-only admin.

## Data model highlights

- **No double bookings, enforced by Postgres:** an exclusion constraint on `tstzrange(starts_at, ends_at)` per tutor
  and per student, so two simultaneous checkouts for one slot can't both succeed.
- **Lesson state and money state are separate:** `bookings.status` (pending payment, confirmed, completed, disputed,
  cancelled, expired) and `bookings.payout_status` (none, scheduled, held, paid, reversed, not due). A late cancellation
  is a cancelled lesson that still pays the tutor part of the price.
- **Row level security:** visitors see only listed tutors; students and tutors see only their own bookings; users can
  edit only harmless fields (name, time zone, tutor profile and price). Everything that moves money runs on the server.
