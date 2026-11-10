import { Status } from '@/components/domain/status';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/display';
import { SceneEmpty } from '@/components/cinematic/scene';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { myListings } from '@/server/services/sales';
import { listingStatusAction } from '../actions';

export const metadata = { title: 'Your aircraft listings' };

export default async function MyListings() {
  const v = await requireViewerPage('/account/listings');
  const listings = await myListings(v.user.id);
  return (
    <>
      <PageHeader eyebrow="Your journeys" title="Aircraft listings" actions={<LinkButton href="/sell-aircraft" arrow>List an aircraft</LinkButton>} />
      {listings.length === 0 ? (
        <SceneEmpty scene="jets-ramp" eyebrow="Aircraft listings" title={<>Selling <em>an aircraft?</em></>} action={<LinkButton href="/sell-aircraft" variant="light" size="lg" arrow>List your aircraft</LinkButton>}>
          We review every listing, then introduce serious buyers. Your details stay private.
        </SceneEmpty>
      ) : (
        <ul className="border-t border-ink">
          {listings.map((l) => (
            <li key={l.id} className="grid gap-6 border-b border-line py-7 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
              <div>
                <div className="mb-3"><Status kind="listing" value={l.status} /></div>
                <p className="font-display text-[28px] leading-tight">{l.yearOfManufacture} {l.manufacturer} {l.model}</p>
                <p className="mt-1 text-[15px] text-ink-2">{l.headline}</p>
                {l.reviewEvents[0]?.note && <p className="mt-3 rounded-sm bg-paper-2 px-4 py-3 text-[14px] text-ink-2"><span className="text-muted">Latest note from ThePrivate:</span> {l.reviewEvents[0].note}</p>}
              </div>
              <dl className="grid grid-cols-3 gap-4 text-[15px] md:grid-cols-1">
                <div><dt className="text-[13px] text-muted">Price</dt><dd className="strip">{l.priceOnRequest || !l.askingPrice ? 'On request' : formatMoney(l.askingPrice.toString(), l.currency)}</dd></div>
                <div><dt className="text-[13px] text-muted">Submitted</dt><dd>{formatDate(l.createdAt)}</dd></div>
                <div><dt className="text-[13px] text-muted">Enquiries</dt><dd className="strip">{l._count.enquiries}</dd></div>
              </dl>
              <div className="flex flex-col gap-2">
                {l.status === 'NEEDS_INFO' && <InlineAction action={listingStatusAction} hidden={{ id: l.id, to: 'SUBMITTED' }} label="Resubmit" variant="primary" confirm="Resubmit for review? Send any extra documents we asked for to our team." />}
                {l.status === 'PUBLISHED' && <InlineAction action={listingStatusAction} hidden={{ id: l.id, to: 'SOLD' }} label="Mark sold" confirm="Mark as sold? It will be removed from Aircraft for sale." />}
                {['SUBMITTED', 'NEEDS_INFO', 'PUBLISHED', 'DRAFT'].includes(l.status) && <InlineAction action={listingStatusAction} hidden={{ id: l.id, to: 'WITHDRAWN' }} label="Withdraw" variant="ghost" confirm="Withdraw this listing?" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
