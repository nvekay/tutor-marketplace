-- Tutor marketplace schema.
-- Lesson state (bookings.status) and money state (bookings.payout_status) are tracked separately:
-- a late cancellation is a cancelled lesson that still pays the tutor part of the price.

create extension if not exists btree_gist;

create type public.user_role as enum ('student', 'tutor', 'admin');

-- pending_payment: slot held while the student is on Stripe Checkout
-- confirmed: paid, lesson ahead · completed: lesson time passed · disputed: complaint or chargeback open
-- cancelled: cancelled after payment (refund per policy) · expired: never paid, hold released
create type public.booking_status as enum ('pending_payment', 'confirmed', 'completed', 'disputed', 'cancelled', 'expired');

-- none: nothing owed yet · scheduled: transfer due at payout_due_at · held: frozen by a dispute
-- paid: transferred to the tutor · reversed: transfer pulled back · not_due: nothing to pay (full refund)
create type public.payout_status as enum ('none', 'scheduled', 'held', 'paid', 'reversed', 'not_due');

-- ─── helpers ──────────────────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null default '',
  timezone text not null default 'UTC',
  avatar_url text,
  -- Shared public demo accounts; the demo admin is read-only
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ─── tutors ───────────────────────────────────────────────────────────────────

create table public.tutors (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  headline text not null default '',
  bio text not null default '',
  subjects text[] not null default '{}',
  hourly_rate_cents integer not null default 3000 check (hourly_rate_cents between 500 and 50000),
  lesson_minutes smallint not null default 60 check (lesson_minutes in (30, 45, 60, 90)),
  stripe_account_id text unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  -- Shown in search only when the tutor can actually be paid and the profile is filled in
  listed boolean generated always as (
    charges_enabled and payouts_enabled and headline <> '' and cardinality(subjects) > 0
  ) stored,
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tutors_listed_idx on public.tutors (listed) where listed;
create index tutors_subjects_idx on public.tutors using gin (subjects);
create trigger tutors_updated_at before update on public.tutors
  for each row execute function public.set_updated_at();

-- A new auth user gets a profile (and a tutor row when they signed up as a tutor).
-- The role can only be student or tutor here; admins are promoted by hand.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  chosen public.user_role := case when new.raw_user_meta_data ->> 'role' = 'tutor' then 'tutor' else 'student' end;
begin
  insert into public.profiles (id, role, full_name, timezone)
  values (
    new.id,
    chosen,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  );
  if chosen = 'tutor' then
    insert into public.tutors (profile_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── availability (in the tutor's own timezone) ───────────────────────────────

create table public.availability_rules (
  id bigint generated always as identity primary key,
  tutor_id uuid not null references public.tutors (profile_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  check (end_minute > start_minute)
);
create index availability_rules_tutor_idx on public.availability_rules (tutor_id);

-- A date with no start/end is a day off; with start/end it replaces that day's weekly hours
create table public.availability_exceptions (
  id bigint generated always as identity primary key,
  tutor_id uuid not null references public.tutors (profile_id) on delete cascade,
  date date not null,
  start_minute smallint check (start_minute between 0 and 1439),
  end_minute smallint check (end_minute between 1 and 1440),
  check ((start_minute is null) = (end_minute is null)),
  check (end_minute is null or end_minute > start_minute)
);
create index availability_exceptions_tutor_date_idx on public.availability_exceptions (tutor_id, date);

-- ─── bookings ─────────────────────────────────────────────────────────────────

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  tutor_id uuid not null references public.tutors (profile_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending_payment',
  price_cents integer not null check (price_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  currency text not null default 'usd',
  hold_expires_at timestamptz,
  checkout_session_id text unique,
  payment_intent_id text unique,
  charge_id text unique,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  payout_status public.payout_status not null default 'none',
  payout_due_at timestamptz,
  payout_cents integer check (payout_cents >= 0),
  transfer_id text unique,
  cancelled_by text check (cancelled_by in ('student', 'tutor', 'admin', 'system')),
  cancel_reason text,
  dispute_reason text,
  resolution text,
  -- Past lessons created by the demo seed (so tutors have reviews); no Stripe money behind them,
  -- excluded from revenue metrics and the payment audit
  seeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (student_id <> tutor_id),
  check (platform_fee_cents < price_cents),
  check (refunded_cents <= price_cents),
  -- No two live bookings may overlap for the same tutor, nor for the same student.
  -- Enforced by the database, so two simultaneous checkouts for one slot can't both win.
  constraint no_tutor_overlap exclude using gist (
    tutor_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending_payment', 'confirmed', 'completed', 'disputed')),
  constraint no_student_overlap exclude using gist (
    student_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending_payment', 'confirmed', 'completed', 'disputed'))
);
create index bookings_student_idx on public.bookings (student_id, starts_at desc);
create index bookings_tutor_idx on public.bookings (tutor_id, starts_at desc);
create index bookings_hold_idx on public.bookings (hold_expires_at) where status = 'pending_payment';
create index bookings_payout_idx on public.bookings (payout_due_at) where payout_status = 'scheduled';
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Append-only history of everything that happened to a booking (who, what, when)
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  type text not null,
  actor_id uuid references public.profiles (id),
  actor_role text not null check (actor_role in ('student', 'tutor', 'admin', 'system', 'stripe')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, id);

-- Every Stripe webhook is stored once by its event id: a redelivered event is a no-op
create table public.stripe_events (
  id text primary key,
  type text not null,
  livemode boolean not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.reviews (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  tutor_id uuid not null references public.tutors (profile_id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index reviews_tutor_idx on public.reviews (tutor_id, created_at desc);

-- Keep the tutor's average rating on the tutor row, so search can sort by it cheaply
create function public.refresh_tutor_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := coalesce(new.tutor_id, old.tutor_id);
begin
  update public.tutors t
  set rating_avg = s.avg, rating_count = s.count
  from (select round(avg(rating)::numeric, 2) as avg, count(*)::int as count
        from public.reviews where tutor_id = target) s
  where t.profile_id = target;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_tutor_rating();

-- ─── row level security ───────────────────────────────────────────────────────
-- Browsers (anon / authenticated keys) only read what is theirs or public, and edit only
-- harmless profile fields. Everything involving money runs on the server with the service role.

alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;

-- Profiles: your own, listed tutors (public cards), and the other side of your bookings
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.tutors t where t.profile_id = profiles.id and t.listed)
  or exists (
    select 1 from public.bookings b
    where (b.student_id = auth.uid() and b.tutor_id = profiles.id)
       or (b.tutor_id = auth.uid() and b.student_id = profiles.id)
  )
);
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, timezone, avatar_url) on public.profiles to authenticated;

create policy tutors_select on public.tutors for select using (listed or profile_id = auth.uid() or public.is_admin());
create policy tutors_update on public.tutors for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
revoke update on public.tutors from authenticated, anon;
grant update (headline, bio, subjects, hourly_rate_cents, lesson_minutes) on public.tutors to authenticated;

create policy availability_rules_select on public.availability_rules for select using (true);
create policy availability_rules_write on public.availability_rules for all
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
create policy availability_exceptions_select on public.availability_exceptions for select using (true);
create policy availability_exceptions_write on public.availability_exceptions for all
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

create policy bookings_select on public.bookings for select
  using (student_id = auth.uid() or tutor_id = auth.uid() or public.is_admin());

create policy booking_events_select on public.booking_events for select using (
  public.is_admin()
  or exists (select 1 from public.bookings b where b.id = booking_id and (b.student_id = auth.uid() or b.tutor_id = auth.uid()))
);

create policy stripe_events_select on public.stripe_events for select using (public.is_admin());

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create policy reviews_select on public.reviews for select using (true);
