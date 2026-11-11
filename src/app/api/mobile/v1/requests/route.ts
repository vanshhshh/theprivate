import { requestSummary } from '@/server/mobile/dto';
import { body, mobile, must, preflight } from '@/server/mobile/http';
import { createRfq, listCustomerRfqs } from '@/server/services/rfq';

export const OPTIONS = preflight;

/** The customer's flight requests (with their booking, if one exists). */
export const GET = mobile({ auth: 'required' }, async ({ viewer }) => (await listCustomerRfqs(must(viewer).user.id)).map(requestSummary));

/** Creates a flight request (same rules as the website). A request is never a booking. */
export const POST = mobile({ auth: 'required' }, async ({ req, viewer }) => {
  const rfq = await createRfq(must(viewer), await body(req));
  return { reference: rfq.reference };
});
