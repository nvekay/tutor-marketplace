import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// End-to-end tests against a running app with real Stripe test mode (pnpm dev + local Supabase + sk_test_ key).
// They create and pay real test-mode bookings, so they refuse to run against anything but localhost.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseURL))
  throw new Error('E2E tests only run against localhost');

export default defineConfig({
  testDir: 'tests/e2e',
  // They share the demo accounts
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', timezoneId: 'America/New_York' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'pnpm dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
