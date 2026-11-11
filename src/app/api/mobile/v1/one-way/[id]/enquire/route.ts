import { body, mobile, must, preflight } from '@/server/mobile/http';
import { enquireEmptyLeg } from '@/server/services/empty-legs';

export const OPTIONS = preflight;

/** An enquiry, not a booking: the partner responds through ThePrivate. */
export const POST = mobile<{ id: string }>({ auth: 'required' }, async ({ req, params, viewer }) => {
  const b = await body(req);
  const e = await enquireEmptyLeg(must(viewer), params.id, { passengers: b.passengers, message: b.message });
  return { enquiryId: e.id };
});
