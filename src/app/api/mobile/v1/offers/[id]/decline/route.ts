import { mobile, must, preflight } from '@/server/mobile/http';
import { declineQuote } from '@/server/services/quotes';

export const OPTIONS = preflight;

export const POST = mobile<{ id: string }>({ auth: 'required' }, async ({ params, viewer }) => {
  await declineQuote(must(viewer), params.id);
  return { ok: true };
});
