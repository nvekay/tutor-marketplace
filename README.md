# Tutor Market

A tutor marketplace demo: students book a lesson and pay upfront, the platform holds the money until the lesson
takes place, then pays the tutor minus a platform fee. Cancellations, refunds and disputes follow clear rules.

Next.js 16 · TypeScript · Supabase (Postgres, Auth, row level security) · Stripe Connect (test mode) · Tailwind CSS

Try it as a student, a tutor or an admin with one click on the sign-in page. Everything runs in Stripe test mode:
pay with `4242 4242 4242 4242`, any future date and any CVC.

## Run locally

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
pnpm db:start        # local Supabase in Docker; prints the keys for .env.local
cp .env.example .env.local   # fill in the Supabase keys and a Stripe test key (sk_test_…)
pnpm seed            # demo accounts, 13 tutors with schedules, reviews and Stripe test accounts
pnpm dev             # http://localhost:3000
pnpm cron --watch    # time-based jobs every minute (expire unpaid holds, …)
```

On `/login`, the demo buttons sign you in as a student, a tutor or an admin.

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

## Booking and payment

1. The student picks a slot; the server checks it is still free and creates a `pending_payment` booking that holds
   the time for 30 minutes (the database rejects a second hold on the same time).
2. A Stripe Checkout session is created on the platform account with the same 30-minute expiry, an idempotency key and
   `transfer_group` = the booking, so the later transfer to the tutor is linked to this payment.
3. The booking is confirmed by `checkout.session.completed` (webhook) or by the success page, whichever comes first;
   both run the same idempotent code. Amount and currency are checked against the booking.
4. Leaving Checkout expires the session at Stripe first, then releases the slot. Unpaid holds are released by the cron
   job. A payment that lands after its hold expired is confirmed if the time is still free, otherwise refunded in full.

## After payment: refunds, payouts, disputes

| Event                                | Student gets back | Tutor gets                  | When the tutor is paid     |
| ------------------------------------ | ----------------- | --------------------------- | -------------------------- |
| Student cancels 24 h or more ahead   | 100%              | nothing                     | –                          |
| Student cancels later                | 50%               | 85% of the other half       | at the original lesson end |
| Tutor cancels                        | 100%              | nothing                     | –                          |
| Lesson takes place                   | –                 | 85% of the price            | 24 h after the lesson      |
| Complaint within 24 h, admin decides | 0–100%            | 85% of what isn't refunded  | when resolved              |
| Chargeback before the payout         | bank decides      | held until the bank decides | if the platform wins       |
| Chargeback after the payout          | bank decides      | transfer reversed           | again if the platform wins |

- Payouts are Stripe transfers with `source_transaction` = the student's charge, so a transfer can't outrun the money
  it comes from, and an idempotency key per payout, so a retried job never pays twice.
- Every money move calls Stripe first (with an idempotency key), then records the result with a conditional update.
  If the second step fails, the retry repeats a no-op Stripe call and completes the record.
- `/api/cron/tick` runs the time-based jobs: expire unpaid holds, send reminders a day ahead, mark finished lessons
  completed, pay tutors whose complaint window has closed. Outside production it accepts `?now=<time>` to run the
  jobs as of a later moment, which shows a lesson's whole life in a few seconds.

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

## Tests

```bash
pnpm test               # unit: slots, time zones and DST, pricing, refund policy, state machine
pnpm test:integration   # against local Supabase: double-booking races, row level security, jobs, webhook idempotency
pnpm test:e2e           # Playwright + real Stripe test mode: book and pay on Checkout, cancel, complaint, payout
pnpm audit:payments     # reconciles every booking with Stripe: payment, refunds, transfers, reversals, stuck states
```

The end-to-end tests finish by running the payment audit, so a passing run also means the database and Stripe agree
on every cent. CI (GitHub Actions) runs formatting, lint, types, unit tests and the build, and the integration tests
against a Supabase started in Docker.

## Deploy (Vercel + Supabase)

1. **Supabase:** create a project, then `supabase link --project-ref <ref>` and `supabase db push` to apply the
   migrations. In Authentication → URL configuration set the site URL to the app's domain.
2. **Vercel:** import the repository and set the variables from `.env.example` (Supabase URL and keys, Stripe test key,
   `CRON_SECRET`, `DEMO_PASSWORD`, `NEXT_PUBLIC_SITE_URL`; `ALLOW_TIME_TRAVEL=true` enables the admin demo shortcuts).
3. **Stripe webhooks** (Workbench → Webhooks → Add destination, in the account that owns the `sk_test_` key). Both use
   the **Your account** scope: with Accounts v2, events of the platform's own connected accounts arrive there.
   - `https://<domain>/api/stripe/webhook`, snapshot payload: `checkout.session.completed`, `checkout.session.expired`,
     `charge.dispute.created`, `charge.dispute.closed` → `STRIPE_WEBHOOK_SECRET`
   - `https://<domain>/api/stripe/events`, thin payload: `v2.core.account[configuration.recipient].capability_status_updated`,
     `v2.core.account[requirements].updated` → `STRIPE_THIN_WEBHOOK_SECRET`
4. **Scheduler:** run [`supabase/sql/schedule-jobs.sql`](supabase/sql/schedule-jobs.sql) in the SQL editor (pg_cron calls
   `/api/cron/tick` every 5 minutes with the secret from Vault).
5. **Demo data:** `ENV_FILE=.env.production.local pnpm seed`, then `ENV_FILE=.env.production.local pnpm audit:payments`
   any time to check the books.
