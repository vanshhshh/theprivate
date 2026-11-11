import { notFound } from '@/server/errors';
import { listing } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { getPublishedListing } from '@/server/services/sales';

export const OPTIONS = preflight;

/** One published listing. The seller's contact details are never included. */
export const GET = mobile<{ id: string }>({ auth: 'optional', cache: 'public:120' }, async ({ params }) => {
  const l = await getPublishedListing(params.id);
  if (!l) throw notFound('Listing');
  return listing(l, true);
});
