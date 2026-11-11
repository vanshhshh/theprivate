import { notFound } from '@/server/errors';
import { oneWay } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { getLiveEmptyLeg } from '@/server/services/empty-legs';

export const OPTIONS = preflight;

export const GET = mobile<{ id: string }>({ auth: 'optional', cache: 'public:60' }, async ({ params }) => {
  const l = await getLiveEmptyLeg(params.id);
  if (!l) throw notFound('One-way offer');
  return oneWay(l);
});
