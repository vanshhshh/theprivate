import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 does not load .env automatically; Node's built-in loader keeps this dependency-free.
if (existsSync('.env')) process.loadEnvFile('.env');

/**
 * The Prisma CLI (migrate, db pull…) must use a DIRECT connection: on Neon that is
 * DATABASE_URL_UNPOOLED, while the app runtime uses the pooled DATABASE_URL
 * (src/server/db/client.ts). Locally there is no pooler, so DATABASE_URL is used for both.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || env('DATABASE_URL') },
});
