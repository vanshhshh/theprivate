import { notFound } from '@/server/errors';
import { requestDetail } from '@/server/mobile/dto';
import { mobile, must, preflight } from '@/server/mobile/http';
import { getCustomerRfq } from '@/server/services/rfq';

export const OPTIONS = preflight;

/** One of the customer's own requests, with its offers (customer-safe projection). */
export const GET = mobile<{ ref: string }>({ auth: 'required' }, async ({ params, viewer }) => {
  const r = await getCustomerRfq(must(viewer).user.id, params.ref);
  if (!r) throw notFound('Request');
  return requestDetail(r);
});
