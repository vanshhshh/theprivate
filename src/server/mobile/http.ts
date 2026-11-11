import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { TransitionError } from '@/domain/lifecycle';
import { viewerFromHeaders, type Viewer } from '@/server/auth/viewer';
import { AppError, type ErrorCode } from '@/server/errors';
import { captureException } from '@/server/log';
import { isMobileOrigin } from './origins';

/**
 * Transport for /api/mobile/v1. Every handler is a thin adapter over an existing service: it
 * authenticates (bearer session), validates, calls the service and returns a customer-safe DTO.
 * No business rule lives here.
 */

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  INVALID_STATE: 409,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
};

export type ApiError = { error: { code: ErrorCode | 'INTERNAL'; message: string; fieldErrors?: Record<string, string> } };

/** CORS for the app's own origins only. Credentials are bearer tokens, never cookies. */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isMobileOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Version',
    'Access-Control-Expose-Headers': 'set-auth-token',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function preflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

type Ctx<P> = { req: Request; params: P; viewer: Viewer | null };
type Options = { auth: 'required' | 'optional'; cache?: 'private' | `public:${number}` };

/** Wraps a handler with auth, CORS, caching and error mapping. */
export function mobile<P = Record<string, never>>(opts: Options, fn: (ctx: Ctx<P>) => Promise<unknown>) {
  return async (req: Request, route?: { params: Promise<P> }) => {
    const origin = req.headers.get('origin');
    const cacheControl = opts.cache?.startsWith('public:') ? `public, max-age=${opts.cache.split(':')[1]}` : 'private, no-store';
    const headers = { ...corsHeaders(origin), 'Cache-Control': cacheControl };
    try {
      const viewer = await viewerFromHeaders(req.headers);
      if (opts.auth === 'required' && !viewer) throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.');
      const params = (route ? await route.params : {}) as P;
      const data = await fn({ req, params, viewer });
      return NextResponse.json({ data }, { headers: viewer ? { ...headers, 'Cache-Control': 'private, no-store' } : headers });
    } catch (err) {
      const noStore = { ...headers, 'Cache-Control': 'no-store' };
      if (err instanceof AppError) return NextResponse.json({ error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } } satisfies ApiError, { status: STATUS[err.code], headers: noStore });
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const i of err.issues) {
          const k = i.path.join('.');
          if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
        }
        return NextResponse.json({ error: { code: 'VALIDATION', message: 'Please check the highlighted fields.', fieldErrors } } satisfies ApiError, { status: 400, headers: noStore });
      }
      if (err instanceof TransitionError) return NextResponse.json({ error: { code: 'INVALID_STATE', message: err.message } } satisfies ApiError, { status: 409, headers: noStore });
      captureException(err);
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } } satisfies ApiError, { status: 500, headers: noStore });
    }
  };
}

/** Requires a viewer (for handlers declared auth: 'required'). */
export function must(v: Viewer | null): Viewer {
  if (!v) throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.');
  return v;
}

/** Reads a JSON body (max 64 KB); invalid JSON is a validation error. */
export async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 65_536) throw new AppError('VALIDATION', 'Request too large.');
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v as Record<string, unknown>;
  } catch {
    throw new AppError('VALIDATION', 'Invalid request body.');
  }
}
