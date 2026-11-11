import { body, mobile, must, preflight } from '@/server/mobile/http';
import { registerDevice, unregisterDevice } from '@/server/push/devices';

export const OPTIONS = preflight;

/** Registers this phone for push notifications (after the customer allows them). */
export const POST = mobile({ auth: 'required' }, async ({ req, viewer }) => registerDevice(must(viewer), await body(req)));

/** Unregisters this phone (sign-out, or push turned off). */
export const DELETE = mobile({ auth: 'required' }, async ({ req, viewer }) => {
  const b = await body(req);
  return unregisterDevice(must(viewer), String(b.token ?? ''));
});
