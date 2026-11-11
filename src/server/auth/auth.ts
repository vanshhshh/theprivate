import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { bearer } from 'better-auth/plugins';
import { MOBILE_APP_ORIGINS } from '@/server/mobile/origins';
import { prisma } from '@/server/db/client';
import { mailerConfig, sendEmail } from '@/server/email/mailer';

/**
 * E-mail verification is required in production once real SMTP is configured, so sign-up can never
 * lock people out on a deployment that cannot send mail. Development and the capture-mode e2e run
 * stay unverified; AUTH_REQUIRE_EMAIL_VERIFICATION=false switches it off explicitly.
 */
export function emailVerificationRequired() {
  const m = mailerConfig();
  return process.env.NODE_ENV === 'production' && process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== 'false' && m.missing.length === 0 && !m.capture;
}

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
    requireEmailVerification: emailVerificationRequired(),
  },
  emailVerification: {
    sendOnSignUp: emailVerificationRequired(),
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      const first = (user.name ?? '').split(' ')[0] || 'there';
      await sendEmail({
        to: user.email,
        subject: 'Confirm your e-mail for ThePrivate',
        text: `Hello ${first},

Please confirm your e-mail address to finish creating your ThePrivate account:

${url}

The link expires in 24 hours. If you did not create an account, you can ignore this e-mail.

ThePrivate`,
      });
    },
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
  // The mobile app (Capacitor) is served from its own origin and authenticates with
  // `Authorization: Bearer <session token>`; bearer() maps that onto the same Session rows.
  trustedOrigins: MOBILE_APP_ORIGINS,
  plugins: [nextCookies(), bearer()],
});
