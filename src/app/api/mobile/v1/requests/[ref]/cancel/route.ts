import { body, mobile, must, preflight } from '@/server/mobile/http';
import { cancelRfq } from '@/server/services/rfq';

export const OPTIONS = preflight;

export const POST = mobile<{ ref: string }>({ auth: 'required' }, async ({ req, params, viewer }) => {
  const b = await body(req);
  await cancelRfq(must(viewer), params.ref, String(b.reason ?? ''));
  return { ok: true };
});
