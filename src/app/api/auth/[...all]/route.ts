import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/server/auth/auth';
import { corsHeaders, preflight } from '@/server/mobile/http';

const handler = toNextJsHandler(auth);

/**
 * Better Auth. The website uses it same-origin with cookies; the mobile app calls it from its own
 * origin (capacitor://localhost, https://localhost) and reads the session token from the
 * `set-auth-token` header (bearer plugin). CORS is granted to those app origins only.
 */
function withAppCors(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const res = await fn(req);
    const cors = corsHeaders(req.headers.get('origin'));
    if (!Object.keys(cors).length) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  };
}

export const GET = withAppCors(handler.GET);
export const POST = withAppCors(handler.POST);
export const OPTIONS = preflight;
