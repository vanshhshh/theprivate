import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Invitation tokens: 32 bytes from the OS CSPRNG, base64url (43 chars). Only the SHA-256 hash is
 * stored. The token carries no company id or e-mail, so it cannot be edited to target another
 * company, and the database alone can never be used to reconstruct a working link.
 */
export function newToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Rejects anything that is not the exact shape we issue, before touching the database. */
export const looksLikeToken = (raw: string) => /^[A-Za-z0-9_-]{43}$/.test(raw);

// ---- Unsubscribe links: stateless and signed, so they work forever and cannot be forged. ----

function secret() {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_SECRET (or BETTER_AUTH_SECRET) is not set');
  return s;
}

const sign = (email: string) => createHmac('sha256', secret()).update(`unsubscribe:${email.toLowerCase()}`).digest('base64url');

export function unsubscribeParams(email: string) {
  return { e: Buffer.from(email.toLowerCase(), 'utf8').toString('base64url'), s: sign(email) };
}

export function readUnsubscribe(e: string | null | undefined, s: string | null | undefined): string | null {
  if (!e || !s || e.length > 400 || s.length > 100) return null;
  let email: string;
  try {
    email = Buffer.from(e, 'base64url').toString('utf8').toLowerCase();
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(email));
  const given = Buffer.from(s);
  return expected.length === given.length && timingSafeEqual(expected, given) ? email : null;
}
