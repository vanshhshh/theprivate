import { env } from '@/config/env';
import { clearToken, readToken } from '@/auth/token';

/**
 * The single way the app talks to ThePrivate. Rules:
 *  - HTTPS to theprivate.in in release builds (see config/env.ts); bearer session, never cookies.
 *  - Every call has a timeout and can be cancelled (AbortSignal).
 *  - Only idempotent GETs are retried, once, on a network failure. Commercial actions (submit,
 *    accept, cancel) are NEVER retried automatically; the caller shows the outcome or the doubt.
 *  - Server messages are shown as-is (they are written for customers); anything unexpected becomes
 *    a calm generic message. Raw stack traces never reach the screen.
 */

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  /** True when we cannot know whether the server acted (timeout / dropped connection). */
  get uncertain() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT';
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
/** Called when the server says the session is gone (expired, revoked, signed out elsewhere). */
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function apiUrl(path: string) {
  return `${env.apiBaseUrl}${path}`;
}

async function once<T>(path: string, opts: RequestOptions): Promise<{ data: T; headers: Headers }> {
  const token = await readToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), opts.timeoutMs ?? 15_000);
  const onAbort = () => controller.abort('cancelled');
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'X-Client-Version': env.version,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiError('CANCELLED', 'Cancelled.', 0);
    if (controller.signal.aborted) throw new ApiError('TIMEOUT', 'ThePrivate is taking too long to respond.', 0);
    throw new ApiError('NETWORK', 'No connection. Check your internet and try again.', 0);
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }

  let json: { data?: T; error?: { code: string; message: string; fieldErrors?: FieldErrors } } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    // Non-JSON (proxy error page, etc.): handled below.
  }
  if (res.status === 401 && token) {
    await clearToken();
    unauthorizedListeners.forEach((l) => l());
  }
  if (!res.ok || json.error) {
    const e = json.error;
    throw new ApiError(e?.code ?? `HTTP_${res.status}`, e?.message ?? 'Something went wrong. Please try again.', res.status, e?.fieldErrors);
  }
  return { data: json.data as T, headers: res.headers };
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  try {
    return (await once<T>(path, opts)).data;
  } catch (e) {
    if (method === 'GET' && e instanceof ApiError && e.code === 'NETWORK' && !opts.signal?.aborted) {
      await new Promise((r) => setTimeout(r, 800));
      return (await once<T>(path, opts)).data;
    }
    throw e;
  }
}

/** Better Auth endpoints (same server). Returns the session token from `set-auth-token`. */
export async function authCall(path: string, body: unknown): Promise<{ token: string | null; json: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/auth${path}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('NETWORK', 'No connection. Check your internet and try again.', 0);
  }
  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(json.code ?? `HTTP_${res.status}`);
    throw new ApiError(code, typeof json.message === 'string' ? json.message : 'Something went wrong. Please try again.', res.status);
  }
  const token = res.headers.get('set-auth-token') || (typeof json.token === 'string' ? json.token : null);
  return { token, json };
}

/** Revokes the session on the server (best effort; the local token is cleared regardless). */
export async function revokeSession(token: string) {
  try {
    await fetch(apiUrl('/api/auth/sign-out'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', credentials: 'omit' });
  } catch {
    // Offline: the token is still deleted from the device; the server session expires on its own.
  }
}
