import { body, mobile, must, preflight } from '@/server/mobile/http';
import { cancelBooking } from '@/server/services/bookings';

export const OPTIONS = preflight;

export const POST = mobile<{ ref: string }>({ auth: 'required' }, async ({ req, params, viewer }) => {
  const b = await body(req);
  await cancelBooking(must(viewer), params.ref, String(b.reason ?? ''), 'CUSTOMER');
  return { ok: true };
});
