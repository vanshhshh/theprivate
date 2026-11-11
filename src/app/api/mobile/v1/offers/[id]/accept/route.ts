import { z } from 'zod';
import { body, mobile, must, preflight } from '@/server/mobile/http';
import { acceptQuote } from '@/server/services/quotes';

export const OPTIONS = preflight;

const input = z.object({
  revision: z.number().int().min(1),
  confirm: z.literal(true, { error: 'Please confirm that you have read the offer terms.' }),
});

/**
 * Accepts the exact revision the customer reviewed. The service refuses a stale revision, an
 * expired offer or a second acceptance, so a retried request can never create two bookings.
 */
export const POST = mobile<{ id: string }>({ auth: 'required' }, async ({ req, params, viewer }) => {
  const { revision } = input.parse(await body(req));
  const b = await acceptQuote(must(viewer), params.id, revision);
  return { booking: b.reference };
});
