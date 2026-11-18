import {defineConfig} from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so it loads the env file itself.
process.loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dbCredentials: {url: process.env.DATABASE_URL!},
});
