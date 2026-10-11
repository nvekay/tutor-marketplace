import { existsSync } from 'node:fs';

// Locally the keys come from .env.local; in CI they are set as environment variables
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
