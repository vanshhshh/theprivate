import { body, mobile, must, preflight } from '@/server/mobile/http';
import { submitBuyerEnquiry } from '@/server/services/sales';

export const OPTIONS = preflight;

/** Buyer enquiry, routed through ThePrivate's sales desk (as on the website). */
export const POST = mobile<{ id: string }>({ auth: 'required' }, async ({ req, params, viewer }) => {
  const v = must(viewer);
  const b = await body(req);
  const e = await submitBuyerEnquiry(v, params.id, { ...b, name: b.name ?? v.user.name, email: v.user.email });
  return { enquiryId: e.id };
});
