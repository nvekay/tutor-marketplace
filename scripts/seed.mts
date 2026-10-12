// Demo data: shared demo accounts, 12 tutors with weekly schedules and Stripe test accounts,
// and past lessons with reviews.
// Safe to re-run: seed users are recreated from scratch, demo accounts are kept.
//   pnpm seed
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { existsSync } from 'node:fs';

// ENV_FILE=.env.production.local pnpm seed  seeds another environment
const envFile = process.env.ENV_FILE ?? '.env.local';
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !secret || !demoPassword)
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_PASSWORD');

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const SEED_DOMAIN = 'seed.example.com';
const FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 1500);

type Role = 'student' | 'tutor' | 'admin';

async function createUser(email: string, fullName: string, role: Role, timezone: string, password: string) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // The signup trigger reads role and timezone from metadata; admin is set below
    user_metadata: { full_name: fullName, role: role === 'tutor' ? 'tutor' : 'student', timezone },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  if (role === 'admin') {
    const { error: e } = await db.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
    if (e) throw e;
  }
  return data.user.id;
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
}

// ─── Stripe test accounts for seeded tutors ───────────────────────────────────
// Created through the API with Stripe's test identity values, so they can receive transfers right away
// (real tutors go through Stripe-hosted onboarding instead). Reused across runs by metadata.seed_key.

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey?.startsWith('sk_live_')) throw new Error('The seed only runs with a test mode key');
const stripe = stripeKey ? new Stripe(stripeKey) : null;

let seedAccounts: Map<string, string> | undefined;

async function existingSeedAccounts(): Promise<Map<string, string>> {
  if (seedAccounts) return seedAccounts;
  seedAccounts = new Map();
  for await (const account of stripe!.v2.core.accounts.list({ limit: 20, closed: false })) {
    const key = account.metadata?.seed_key;
    if (key) seedAccounts.set(key, account.id);
  }
  return seedAccounts;
}

async function seedStripeAccount(seedKey: string, fullName: string): Promise<string> {
  const existing = (await existingSeedAccounts()).get(seedKey);
  if (existing) return existing;
  const [given, ...rest] = fullName.split(' ');
  const account = await stripe!.v2.core.accounts.create({
    display_name: fullName,
    contact_email: seedKey,
    // No Stripe dashboard and the platform collects the details: the API can submit them directly
    dashboard: 'none',
    identity: {
      country: 'us',
      entity_type: 'individual',
      attestations: { terms_of_service: { account: { date: new Date().toISOString(), ip: '127.0.0.1' } } },
      business_details: { phone: '0000000000' },
      individual: {
        given_name: given,
        surname: rest.join(' ') || 'Tutor',
        email: seedKey,
        phone: '0000000000',
        // Stripe's test values that verify immediately
        date_of_birth: { day: 1, month: 1, year: 1901 },
        id_numbers: [{ type: 'us_ssn', value: '000000000' }],
        address: {
          line1: 'address_full_match',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94111',
          country: 'us',
        },
      },
    },
    defaults: {
      currency: 'usd',
      profile: {
        business_url: 'https://github.com/nvekay/tutor-marketplace',
        product_description: 'Online tutoring lessons',
      },
      responsibilities: { fees_collector: 'application', losses_collector: 'application' },
    },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    metadata: { seed_key: seedKey },
  });
  seedAccounts!.set(seedKey, account.id);
  return account.id;
}

async function transfersActive(accountId: string): Promise<boolean> {
  const account = await stripe!.v2.core.accounts.retrieve(accountId, { include: ['configuration.recipient'] });
  return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
}

// ─── demo accounts (public, used by the "Try as …" buttons) ───────────────────

const DEMO = [
  { email: 'student@demo.example.com', name: 'Alex Morgan', role: 'student' as const, tz: 'America/New_York' },
  { email: 'tutor@demo.example.com', name: 'Maria Keller', role: 'tutor' as const, tz: 'Europe/Berlin' },
  { email: 'admin@demo.example.com', name: 'Demo Admin', role: 'admin' as const, tz: 'UTC' },
];

// ─── tutors ───────────────────────────────────────────────────────────────────

const TUTORS = [
  {
    name: 'Daniel Brooks',
    tz: 'America/New_York',
    rate: 45,
    subjects: ['Math', 'SAT'],
    headline: 'Calculus and SAT math without the panic',
    bio: 'Former high-school teacher. I break hard problems into small steps and give you a plan for every week until the exam.',
    hours: [
      [1, 16, 21],
      [3, 16, 21],
      [5, 15, 19],
    ],
  },
  {
    name: 'Sofia Ramirez',
    tz: 'Europe/Madrid',
    rate: 30,
    subjects: ['Spanish'],
    headline: 'Conversational Spanish from day one',
    bio: 'Native speaker from Valencia. Lessons are 80% speaking, with notes and vocabulary you keep after every class.',
    hours: [
      [1, 9, 13],
      [2, 17, 21],
      [4, 9, 13],
      [6, 10, 14],
    ],
  },
  {
    name: 'Kenji Watanabe',
    tz: 'Asia/Tokyo',
    rate: 55,
    subjects: ['Programming', 'Python', 'Data science'],
    headline: 'Python and data science for career switchers',
    bio: 'Senior data engineer. We build real projects with pandas, SQL and scikit-learn, and review your code line by line.',
    hours: [
      [2, 19, 23],
      [4, 19, 23],
      [6, 9, 15],
    ],
  },
  {
    name: 'Emily Clarke',
    tz: 'Europe/London',
    rate: 40,
    subjects: ['English', 'IELTS'],
    headline: 'IELTS 7+ with a clear strategy for each section',
    bio: 'CELTA-certified, 8 years of IELTS preparation. Mock tests with detailed feedback on writing and speaking.',
    hours: [
      [1, 8, 12],
      [2, 8, 12],
      [3, 18, 21],
      [5, 8, 12],
    ],
  },
  {
    name: 'Lukas Novak',
    tz: 'Europe/Prague',
    rate: 35,
    subjects: ['Physics', 'Math'],
    headline: 'Physics that finally makes sense',
    bio: 'PhD student in applied physics. Mechanics, electricity and exam prep with lots of drawings and intuition.',
    hours: [
      [1, 17, 21],
      [3, 17, 21],
      [7, 10, 14],
    ],
  },
  {
    name: 'Priya Nair',
    tz: 'Asia/Kolkata',
    rate: 25,
    subjects: ['Chemistry', 'Biology'],
    headline: 'Chemistry and biology for school and pre-med exams',
    bio: 'Medical student who loves teaching. Organic chemistry reactions explained with patterns, not memorisation.',
    hours: [
      [1, 18, 22],
      [2, 18, 22],
      [4, 18, 22],
      [6, 10, 14],
    ],
  },
  {
    name: 'Marco Bianchi',
    tz: 'Europe/Rome',
    rate: 50,
    subjects: ['Piano', 'Music theory'],
    headline: 'Piano for adult beginners',
    bio: 'Conservatory graduate. Start playing the songs you love in the first month, then build real technique.',
    hours: [
      [2, 10, 14],
      [3, 15, 19],
      [5, 10, 14],
    ],
  },
  {
    name: 'Hannah Schmidt',
    tz: 'Europe/Berlin',
    rate: 32,
    subjects: ['German'],
    headline: 'German A1–B2, structured and practical',
    bio: 'Goethe-certified teacher. Grammar in small doses, lots of speaking, and homework that takes 15 minutes a day.',
    hours: [
      [1, 9, 12],
      [3, 9, 12],
      [4, 17, 20],
      [5, 9, 12],
    ],
  },
  {
    name: 'Carlos Mendes',
    tz: 'America/Sao_Paulo',
    rate: 28,
    subjects: ['Guitar'],
    headline: 'Guitar: chords, rhythm and your first songs',
    bio: 'Session musician for 12 years. Acoustic and electric, from first chords to improvisation over backing tracks.',
    hours: [
      [2, 18, 22],
      [4, 18, 22],
      [6, 13, 17],
    ],
  },
  {
    name: 'Olivia Chen',
    tz: 'America/Los_Angeles',
    rate: 65,
    subjects: ['Programming', 'JavaScript', 'React'],
    headline: 'Frontend interviews and React from scratch',
    bio: 'Staff engineer at a SaaS company. Interview practice, system design for frontend, and code reviews of your projects.',
    hours: [
      [1, 17, 20],
      [3, 17, 20],
      [6, 9, 13],
    ],
  },
  {
    name: 'Ahmed Hassan',
    tz: 'Africa/Cairo',
    rate: 22,
    subjects: ['Arabic', 'English'],
    headline: 'Arabic for beginners, Modern Standard and Egyptian',
    bio: 'Patient and structured: alphabet, reading and everyday conversation, with materials adapted to your goals.',
    hours: [
      [1, 15, 20],
      [2, 15, 20],
      [3, 15, 20],
      [7, 12, 16],
    ],
  },
  {
    name: 'Grace Kim',
    tz: 'Asia/Seoul',
    rate: 38,
    subjects: ['Korean'],
    headline: 'Korean for K-drama fans and travellers',
    bio: 'Hangul in one lesson, then real conversations. I use clips from shows you like to practice listening.',
    hours: [
      [2, 19, 22],
      [4, 19, 22],
      [6, 10, 15],
      [7, 10, 15],
    ],
  },
];

const STUDENTS = ['Liam Walker', 'Noah Fischer', 'Ava Rossi', 'Mia Dubois', 'Lucas Silva', 'Chloe Martin'];

const COMMENTS = [
  'Super clear explanations, I finally get it.',
  'Very patient and well prepared. Booked the next lesson right away.',
  'Great structure and useful homework.',
  'Friendly and practical, exactly what I needed before my exam.',
  'Good lesson, a bit fast at times but very helpful.',
  'Excellent tutor. Feedback was specific and actionable.',
];

const priceFor = (ratePerHour: number, minutes: number) => Math.round((ratePerHour * 100 * minutes) / 60);
const feeFor = (price: number) => Math.round((price * FEE_BPS) / 10_000);

async function main() {
  // Demo accounts are reused: keep them and their history if they already exist
  const demoIds: Record<string, string> = {};
  for (const d of DEMO) {
    demoIds[d.role] = (await findUserId(d.email)) ?? (await createUser(d.email, d.name, d.role, d.tz, demoPassword!));
  }
  await db.from('profiles').update({ is_demo: true }).in('id', Object.values(demoIds));

  // Seed users are recreated so re-running gives the same data (cascades remove their rows)
  const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of existing.users.filter((u) => u.email?.endsWith(`@${SEED_DOMAIN}`))) {
    await db.from('bookings').delete().or(`tutor_id.eq.${u.id},student_id.eq.${u.id}`);
    await db.auth.admin.deleteUser(u.id);
  }

  const studentIds: string[] = [];
  for (const [i, name] of STUDENTS.entries()) {
    studentIds.push(await createUser(`student${i + 1}@${SEED_DOMAIN}`, name, 'student', 'UTC', crypto.randomUUID()));
  }

  // The demo tutor gets a profile and a schedule too
  const tutorRows = [
    {
      id: demoIds.tutor,
      ...{
        name: 'Maria Keller',
        tz: 'Europe/Berlin',
        rate: 42,
        subjects: ['Math', 'Statistics'],
        headline: 'Statistics and math for university students',
        bio: 'Demo tutor account. Try the tutor dashboard: schedule, bookings and earnings.',
        hours: [
          [1, 10, 18],
          [2, 10, 18],
          [3, 10, 18],
          [4, 10, 18],
          [5, 10, 16],
        ],
      },
    },
  ];
  for (const [i, t] of TUTORS.entries()) {
    tutorRows.push({
      id: await createUser(`tutor${i + 1}@${SEED_DOMAIN}`, t.name, 'tutor', t.tz, crypto.randomUUID()),
      ...t,
    });
  }

  if (!stripe) console.warn('STRIPE_SECRET_KEY is not set: tutors are listed without Stripe accounts (no payments)');
  const emails = [DEMO[1].email, ...TUTORS.map((_, i) => `tutor${i + 1}@${SEED_DOMAIN}`)];

  for (const [i, t] of tutorRows.entries()) {
    const accountId = stripe ? await seedStripeAccount(emails[i], t.name) : null;
    const { error } = await db
      .from('tutors')
      .update({
        headline: t.headline,
        bio: t.bio,
        subjects: t.subjects,
        hourly_rate_cents: t.rate * 100,
        lesson_minutes: 60,
        stripe_account_id: accountId,
        transfers_enabled: accountId ? await transfersActive(accountId) : true,
        payouts_enabled: false,
        stripe_requirements: [],
        stripe_synced_at: accountId ? new Date().toISOString() : null,
      })
      .eq('profile_id', t.id);
    if (error) throw error;

    await db.from('availability_rules').delete().eq('tutor_id', t.id);
    await db.from('availability_rules').insert(
      t.hours.map(([weekday, from, to]) => ({
        tutor_id: t.id,
        weekday,
        start_minute: from * 60,
        end_minute: to * 60,
      })),
    );

    // Past lessons with reviews: 3 to 8 per tutor, spread over the last 60 days
    if (t.id === demoIds.tutor) continue;
    const lessons = 3 + (i % 6);
    for (let n = 0; n < lessons; n++) {
      // Each tutor teaches at their own hour, so one student never has two seeded lessons at once
      // (the no_student_overlap constraint would reject that)
      const starts = new Date(Date.now() - (3 + n * 7 + i) * 86_400_000);
      starts.setUTCHours(6 + i, 0, 0, 0);
      const ends = new Date(starts.getTime() + 60 * 60_000);
      const price = priceFor(t.rate, 60);
      const { data: booking, error: e } = await db
        .from('bookings')
        .insert({
          student_id: studentIds[(i + n) % studentIds.length],
          tutor_id: t.id,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          status: 'completed',
          price_cents: price,
          platform_fee_cents: feeFor(price),
          payout_status: 'paid',
          payout_cents: price - feeFor(price),
          seeded: true,
        })
        .select('id, student_id')
        .single();
      if (e) throw e;
      await db.from('reviews').insert({
        booking_id: booking.id,
        tutor_id: t.id,
        student_id: booking.student_id,
        rating: n % 5 === 4 ? 4 : 5,
        comment: COMMENTS[(i + n) % COMMENTS.length],
        // Written a few hours after the lesson, not on the day the demo was seeded
        created_at: new Date(ends.getTime() + (2 + (n % 5)) * 3_600_000).toISOString(),
      });
    }
  }

  const { count } = await db.from('tutors').select('*', { count: 'exact', head: true }).eq('listed', true);
  console.log(
    `Seeded: ${tutorRows.length} tutors (${count} listed), ${STUDENTS.length} students, demo accounts: ${DEMO.map((d) => d.email).join(', ')}`,
  );
}

await main();
