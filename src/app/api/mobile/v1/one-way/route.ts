import { z } from 'zod';
import { oneWay } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { listLiveEmptyLegs } from '@/server/services/empty-legs';

export const OPTIONS = preflight;

const filters = z.object({
  country: z.string().length(2).toUpperCase().optional().catch(undefined),
  from: z.string().max(40).optional().catch(undefined),
  after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100).optional().catch(1),
});

/** Live, published one-way offers only (same rules as /empty-legs). */
export const GET = mobile({ auth: 'optional', cache: 'public:120' }, async ({ req }) => {
  const f = filters.parse(Object.fromEntries(new URL(req.url).searchParams));
  const r = await listLiveEmptyLegs({ country: f.country, from: f.from, after: f.after }, f.page ?? 1);
  return { items: r.items.map(oneWay), total: r.total, page: f.page ?? 1, pageSize: 24 };
});
