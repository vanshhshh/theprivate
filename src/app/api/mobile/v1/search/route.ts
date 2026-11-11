import { categoryLabel, statusInfo } from '@/components/domain/status';
import { AppError } from '@/server/errors';
import { airport } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { searchCharter, searchSchema } from '@/server/services/charter-search';

export const OPTIONS = preflight;

/**
 * Charter search over verified supply (same service as /charter). Availability and indicative
 * prices are passed through with their labels; nothing here is a confirmed offer.
 */
export const GET = mobile({ auth: 'optional', cache: 'public:60' }, async ({ req }) => {
  const input = searchSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const r = await searchCharter(input);
  if (!r.ok) throw new AppError('VALIDATION', r.error);
  return {
    from: airport(r.from),
    to: airport(r.to),
    distanceNm: r.distanceNm,
    blocked: r.blocked,
    results: r.results.map((x) => ({
      aircraftId: x.aircraftId,
      type: x.typeLabel,
      category: x.category ? { value: x.category, label: categoryLabel(x.category) } : null,
      seats: x.seats,
      rangeNm: x.rangeNm,
      rangeNote: x.rangeNote,
      partner: { name: x.operator.name, slug: x.operator.isPubliclyListed ? x.operator.slug : null, authority: x.operator.authority },
      homeBase: x.homeBase,
      availability: statusInfo('availability', x.availability, 'customer'),
      indicative: x.indicative,
    })),
  };
});
