import { notFound } from 'next/navigation';
import { Itinerary, routeSummary } from '@/components/domain/itinerary';
import { Status, statusLabel } from '@/components/domain/status';
import { DL, Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { getOperatorBooking } from '@/server/services/bookings';
import { bookingAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function OperatorBooking({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { operatorId, membership } = await requireOperatorPage(`/operator/bookings/${ref}`);
  const b = await getOperatorBooking(operatorId, ref);
  if (!b) notFound();
  const manager = hasRole(membership.role, 'MANAGER');
  return (
    <>
      <PageHeader eyebrow={<span className="strip">Booking {b.reference}</span>} title={<span className="strip">{routeSummary(b.legs)}</span>} actions={<Status kind="booking" value={b.status} />} />
      {b.status === 'PENDING_OPERATOR_CONFIRMATION' && <div className="mb-8"><Notice tone="warning" title="Confirmation needed">Confirm only once crew, aircraft and permits are secured. Confirming commits you to operate at the quoted price.</Notice></div>}
      {b.status === 'PAYMENT_PENDING' && <div className="mb-8"><Notice>Confirmed. ThePrivate is arranging customer payment; you will be notified when settlement is verified. Do not operate before the booking shows Paid unless agreed in writing with ThePrivate.</Notice></div>}
      <div className="grid gap-12 xl:grid-cols-[1fr_360px]">
        <div>
          <SectionTitle>Itinerary</SectionTitle>
          <Itinerary legs={b.legs} />
          {b.rfq.requirements && <div className="mt-6"><Notice title="Customer notes">{b.rfq.requirements}</Notice></div>}
          <div className="mt-12">
            <SectionTitle>History</SectionTitle>
            <ul className="text-sm">
              {b.events.map((e) => (
                <li key={e.id} className="flex justify-between border-b border-line py-2"><span>{statusLabel('booking', e.toStatus)}{e.note ? ` · ${e.note}` : ''}</span><span className="strip text-muted">{formatDateTime(e.createdAt)}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="flex flex-col gap-10">
          <section>
            <SectionTitle>Commercials</SectionTitle>
            <DL items={[
              ['Aircraft', <span key="a" className="strip">{b.aircraft.registration}</span>],
              ['Your price', <span key="p" className="strip">{formatMoney(b.quoteRevision.operatorPrice.toString(), b.quoteRevision.currency)}</span>],
              ['Payment', b.payments.some((p) => p.status === 'SETTLED') ? 'Settled' : 'Not settled'],
            ]} />
          </section>
          <section>
            <SectionTitle>Customer</SectionTitle>
            <DL items={[['Lead passenger', b.rfq.contactName], ['Phone', b.rfq.contactPhone], ['Account', `${b.customer.name} · ${b.customer.email}`], ['Passengers', b.rfq.passengers]]} />
            <p className="mt-2 text-xs text-muted">Use these details only to operate this booking.</p>
          </section>
          <section className="flex flex-col gap-3">
            {b.status === 'PENDING_OPERATOR_CONFIRMATION' && manager && <InlineAction action={bookingAction} hidden={{ reference: b.reference, op: 'confirm' }} label="Confirm booking" variant="primary" confirm="Confirm this booking at the quoted price?" />}
            {b.status === 'PAID' && <InlineAction action={bookingAction} hidden={{ reference: b.reference, op: 'start' }} label="Mark in progress" confirm="Mark the trip as started?" />}
            {b.status === 'IN_PROGRESS' && <InlineAction action={bookingAction} hidden={{ reference: b.reference, op: 'complete' }} label="Mark completed" variant="primary" confirm="Mark the trip as completed?" />}
            {b.status === 'PENDING_OPERATOR_CONFIRMATION' && <InlineAction action={bookingAction} hidden={{ reference: b.reference, op: 'cancel' }} label="Cannot operate: cancel" variant="danger" reason={{ label: 'Explain to the customer', required: true }} />}
          </section>
        </aside>
      </div>
    </>
  );
}
