import 'server-only';
import { z } from 'zod';

/** Lines like "KEY=" in .env files arrive as empty strings and must mean "not set" */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  // Payments are optional while developing other parts; payment code fails with a clear error without them
  STRIPE_SECRET_KEY: optional(
    z
      .string()
      .refine((key) => !key.startsWith('sk_live_'), 'This demo runs in Stripe test mode only: use an sk_test_ key'),
  ),
  STRIPE_WEBHOOK_SECRET: optional(z.string()),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(5000).default(1500),
  CRON_SECRET: z.string().min(8),
  DEMO_PASSWORD: optional(z.string().min(8)),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server configuration; read lazily so `next build` doesn't need every secret */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  cached = parsed.data;
  return cached;
}
