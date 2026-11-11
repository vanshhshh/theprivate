import { prisma } from '@/server/db/client';
import { listing, oneWay, requestSummary } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { listLiveEmptyLegs } from '@/server/services/empty-legs';
import { listCustomerRfqs } from '@/server/services/rfq';
import { listPublishedListings } from '@/server/services/sales';

export const OPTIONS = preflight;

/** Discover: live one-way offers, published aircraft and (signed in) the customer's next journey. */
export const GET = mobile({ auth: 'optional', cache: 'public:120' }, async ({ viewer }) => {
  const [legs, sale] = await Promise.all([listLiveEmptyLegs({}, 1), listPublishedListings({ page: 1 })]);
  let next = null;
  let unread = 0;
  if (viewer) {
    const [rfqs, count] = await Promise.all([listCustomerRfqs(viewer.user.id), prisma.notification.count({ where: { userId: viewer.user.id, readAt: null } })]);
    const open = rfqs.find((r) => !['EXPIRED', 'CANCELLED'].includes(r.status) && !(r.booking && ['COMPLETED', 'CANCELLED'].includes(r.booking.status)));
    next = open ? requestSummary(open) : null;
    unread = count;
  }
  return { oneWay: legs.items.slice(0, 6).map(oneWay), aircraft: sale.items.slice(0, 6).map((l) => listing(l)), nextJourney: next, unread };
});
