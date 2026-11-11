import 'server-only';
import { createSign } from 'node:crypto';

/**
 * Push via Firebase Cloud Messaging HTTP v1 (Android directly; iOS through the APNs key uploaded to
 * the same Firebase project). Configured with FCM_SERVICE_ACCOUNT: the service-account JSON,
 * base64-encoded, held only on the server. Without it, push deliveries are recorded as
 * SKIPPED_NOT_CONFIGURED; nothing pretends to be sent.
 */

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

export interface PushMessage { token: string; title: string; body: string; data: Record<string, string> }
export type PushResult = { ok: true; id: string } | { ok: false; invalidToken: boolean; error: string };

export interface PushProvider { send(m: PushMessage): Promise<PushResult> }

function account(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const a = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
    return a.project_id && a.client_email && a.private_key ? a : null;
  } catch {
    return null;
  }
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(a: ServiceAccount) {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(a.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`FCM auth failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export function pushProvider(): PushProvider | null {
  const a = account();
  if (!a) return null;
  return {
    async send(m) {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken(a)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: m.token,
            notification: { title: m.title, body: m.body },
            data: m.data,
            android: { priority: 'HIGH', notification: { channel_id: 'updates' } },
            apns: { payload: { aps: { sound: 'default', 'thread-id': 'updates' } } },
          },
        }),
      });
      if (res.ok) return { ok: true, id: ((await res.json()) as { name: string }).name };
      const err = (await res.json().catch(() => ({}))) as { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } };
      const code = err.error?.details?.find((d) => d.errorCode)?.errorCode ?? err.error?.status ?? `HTTP_${res.status}`;
      return { ok: false, invalidToken: code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT' || res.status === 404, error: `${code}: ${err.error?.message ?? ''}`.slice(0, 300) };
    },
  };
}

/**
 * What a lock screen may show: a generic line per kind of update. Routes, names, prices and
 * references stay inside the app, which loads the details after it is opened (and unlocked).
 */
export function lockScreenText(type: string): { title: string; body: string } {
  if (type.startsWith('rfq.quote') || type.startsWith('quote.')) return { title: 'ThePrivate', body: 'You have a new offer to review.' };
  if (type.startsWith('rfq.')) return { title: 'ThePrivate', body: 'Your flight request has an update.' };
  if (type.startsWith('booking.')) return { title: 'ThePrivate', body: 'Your booking has an update.' };
  if (type.startsWith('emptyleg.')) return { title: 'ThePrivate', body: 'Your one-way enquiry has an update.' };
  if (type.startsWith('sale.')) return { title: 'ThePrivate', body: 'Your aircraft listing has an update.' };
  if (type.startsWith('account.') || type.startsWith('security.')) return { title: 'ThePrivate', body: 'There is an update about your account.' };
  return { title: 'ThePrivate', body: 'You have a new update.' };
}
