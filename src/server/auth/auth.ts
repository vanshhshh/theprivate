import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/server/db/client';

/**
 * Authentication only (who you are). Authorisation (what you may do) lives in
 * permissions.ts / guards.ts and is always checked server-side.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    // E-mail verification is enforced once an e-mail provider is configured (see integrations/messaging).
    requireEmailVerification: false,
  },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: process.env.AUTH_RATE_LIMIT !== 'off',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 8 },
      '/sign-up/email': { window: 3600, max: 20 },
    },
  },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  plugins: [nextCookies()],
});
