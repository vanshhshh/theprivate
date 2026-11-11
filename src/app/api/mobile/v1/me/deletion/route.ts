import { z } from 'zod';
import { body, mobile, must, preflight } from '@/server/mobile/http';
import { requestAccountDeletion } from '@/server/services/account';

export const OPTIONS = preflight;

const input = z.object({ confirm: z.literal(true, { error: 'Please confirm the deletion request.' }), reason: z.string().max(1000).optional() });

/** Starts account deletion (staff verify and complete it; the customer is e-mailed). */
export const POST = mobile({ auth: 'required' }, async ({ req, viewer }) => {
  const { reason } = input.parse(await body(req));
  const r = await requestAccountDeletion(must(viewer), { reason });
  return { requestedAt: r.requestedAt.toISOString(), alreadyRequested: r.alreadyRequested };
});
