import { notFound } from 'next/navigation';
import { Itinerary, routeSummary } from '@/components/domain/itinerary';
import { Status, statusLabel } from '@/components/domain/status';
import { DL, Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { settlementAction, staffCancelBookingAction } from '../../actions';

export default async function AdminBooking({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const v = await requirePermissionPage('booking.read', `/admin/bookings/${ref}`);
  const b = await prisma.booking.findUnique({
    where: { reference: ref },
    include: { customer: { select: { name: true, email: true } }, operator: { select: { legalName: true } }, aircraft: { select: { registration: true } }, legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } }, events: { orderBy: { createdAt: 'asc' } }, payments: true, quoteRevision: true },
  });
  if (!b) notFound();
  const canSettle = ['CONFIRMED', 'PAYMENT_PENDING'].includes(b.status) && can(v, 'payment.record_offline');
  return (
    <>
      <PageHeader eyebrow={<span className="strip">Booking {b.reference}</span>} title={<span className="strip">{routeSummary(b.legs)}</span>} actions={<Status kind="booking" value={b.status} />} />
      <div className="grid gap-12 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-12">
          <Itinerary legs={b.legs} />
          <section>
            <SectionTitle>Events</SectionTitle>
            <ul className="text-sm">{b.events.map((e) => <li key={e.id} className="flex justify-between border-b border-line py-2"><span>{statusLabel('booking', e.toStatus)} · {e.actorType.toLowerCase()}{e.note ? ` · ${e.note}` : ''}</span><span className="strip text-muted">{formatDateTime(e.createdAt)}</span></li>)}</ul>
          </section>
          <section>
            <SectionTitle>Payments</SectionTitle>
            {b.payments.length === 0 ? <p className="text-sm text-muted">No payment recorded.</p> : (
              <ul className="text-sm">{b.payments.map((p) => <li key={p.id} className="border-b border-line py-2">{p.provider} · <span className="strip">{p.providerRef}</span> · {formatMoney(p.amount.toString(), p.currency)} · {p.status.toLowerCase()}{p.evidenceNote ? <span className="block text-xs text-muted">{p.evidenceNote}</span> : null}</li>)}</ul>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-10">
          <DL items={[
            ['Customer', `${b.customer.name} · ${b.customer.email}`],
            ['Operator', b.operator.legalName],
            ['Aircraft', <span key="a" className="strip">{b.aircraft.registration}</span>],
            ['Customer total', <span key="t" className="strip">{formatMoney(b.customerTotal.toString(), b.currency)}</span>],
            ['Operator price', <span key="o" className="strip">{formatMoney(b.quoteRevision.operatorPrice.toString(), b.currency)}</span>],
            ['Platform fee', <span key="f" className="strip">{formatMoney(b.quoteRevision.platformFee.toString(), b.currency)}</span>],
          ]} />
          {canSettle && (
            <section>
              <SectionTitle>Record verified settlement</SectionTitle>
              <Notice tone="warning">Only record money that has actually arrived and been reconciled (bank statement / UTR). This marks the booking Paid and is audited.</Notice>
              <ActionForm action={settlementAction} className="mt-5 flex flex-col gap-5">
                <input type="hidden" name="reference" value={b.reference} />
                <Field name="amount" label={`Amount received (${b.currency})`} hint={`Must equal ${b.customerTotal.toString()}`}><Input name="amount" inputMode="decimal" required className="strip" /></Field>
                <Field name="providerRef" label="Bank / UTR reference"><Input name="providerRef" required className="strip" /></Field>
                <Field name="evidenceNote" label="How was it verified?"><Textarea name="evidenceNote" rows={3} required /></Field>
                <SubmitButton>Record settlement</SubmitButton>
              </ActionForm>
            </section>
          )}
          {can(v, 'booking.manage') && !['CANCELLED', 'COMPLETED', 'IN_PROGRESS'].includes(b.status) && (
            <InlineAction action={staffCancelBookingAction} hidden={{ reference: b.reference }} label="Cancel booking" variant="danger" reason={{ label: 'Reason (sent to both parties)', required: true }} />
          )}
        </aside>
      </div>
    </>
  );
}
