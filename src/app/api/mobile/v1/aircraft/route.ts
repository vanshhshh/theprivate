import { listing } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { listPublishedListings } from '@/server/services/sales';

export const OPTIONS = preflight;

/** Published aircraft-for-sale listings only. */
export const GET = mobile({ auth: 'optional', cache: 'public:120' }, async ({ req }) => {
  const r = await listPublishedListings(Object.fromEntries(new URL(req.url).searchParams));
  return { items: r.items.map((l) => listing(l)), total: r.total, page: r.page, pageSize: 18 };
});
