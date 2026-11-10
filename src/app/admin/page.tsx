import { PageHeader, SectionTitle, Stat } from '@/components/ui/display';
import { statusLabel } from '@/components/domain/status';
import { requirePermissionPage } from '@/server/auth/viewer';
import { overviewMetrics } from '@/server/services/admin';

export default async function AdminHome() {
  await requirePermissionPage('metrics.read', '/admin');
  const m = await overviewMetrics();
  const stages = ['DISCOVERED', 'CLAIMED', 'IN_REVIEW', 'VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE', 'SUSPENDED', 'EXCLUDED'];
  const reviews = ['IMPORTED_UNREVIEWED', 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'];
  return (
    <>
      <PageHeader eyebrow="Admin" title="Operations overview" lede="Every figure is a live count from the database." />
      <SectionTitle>Needs attention</SectionTitle>
      <div className="mb-14 grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Claims to review" value={m.openClaims} href="/admin/claims" />
        <Stat label="Aircraft to review" value={m.submittedAircraft} href="/admin/aircraft?queue=1" />
        <Stat label="Unmatched requests" value={m.unmatchedRfqs} href="/admin/requests?status=MATCHING" />
        <Stat label="Bookings awaiting operator" value={m.pendingBookings} href="/admin/bookings" />
        <Stat label="Awaiting payment" value={m.awaitingPayment} href="/admin/bookings?status=PAYMENT_PENDING" />
        <Stat label="Listings to review" value={m.submittedListings} href="/admin/sales" />
        <Stat label="Open data conflicts" value={m.openConflicts} href="/admin/data/conflicts" />
        <Stat label="Identity matches" value={m.pendingMatches} href="/admin/data/matches" />
      </div>
      <div className="grid gap-14 lg:grid-cols-2">
        <section>
          <SectionTitle>Operator pipeline</SectionTitle>
          <ul className="divide-y divide-line">
            {stages.map((s) => (
              <li key={s} className="flex justify-between py-2.5"><a className="hover:text-magenta" href={`/admin/operators?lifecycle=${s}`}>{statusLabel('operator', s)}</a><span className="strip">{m.operatorsByStage[s] ?? 0}</span></li>
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle>Aircraft review</SectionTitle>
          <ul className="divide-y divide-line">
            {reviews.map((s) => (
              <li key={s} className="flex justify-between py-2.5"><a className="hover:text-magenta" href={`/admin/aircraft?review=${s}`}>{statusLabel('aircraftReview', s)}</a><span className="strip">{m.aircraftByReview[s] ?? 0}</span></li>
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle>Marketplace</SectionTitle>
          <ul className="divide-y divide-line">
            <li className="flex justify-between py-2.5"><span>Open requests</span><span className="strip">{m.openRfqs}</span></li>
            <li className="flex justify-between py-2.5"><span>Live empty legs</span><span className="strip">{m.liveEmptyLegs}</span></li>
            <li className="flex justify-between py-2.5"><span>Published sale listings</span><span className="strip">{m.publishedListings}</span></li>
            <li className="flex justify-between py-2.5"><span>Customer accounts</span><span className="strip">{m.customers}</span></li>
          </ul>
        </section>
      </div>
    </>
  );
}
