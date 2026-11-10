import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Itinerary, routeSummary } from '@/components/domain/itinerary';
import { Status } from '@/components/domain/status';
import { DL, PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Select, SubmitButton } from '@/components/ui/form';
import { QUOTABLE_AIRCRAFT_WHERE } from '@/domain/charter/eligibility';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { routeRfqAction } from '../../actions';

export default async function AdminRequest({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const v = await requirePermissionPage('rfq.read', `/admin/requests/${ref}`);
  const rfq = await prisma.rfq.findUnique({
    where: { reference: ref },
    include: {
      customer: { select: { name: true, email: true } },
      legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } },
      recipients: { include: { operator: { select: { id: true, legalName: true } } } },
      quotes: { include: { operator: { select: { legalName: true } }, aircraft: { select: { registration: true } }, revisions: { orderBy: { revision: 'desc' }, take: 1 } } },
      booking: { select: { reference: true, status: true } },
    },
  });
  if (!rfq) notFound();
  const routed = new Set(rfq.recipients.map((r) => r.operatorId));
  const candidates = can(v, 'rfq.route')
    ? await prisma.operator.findMany({ where: { lifecycle: 'ACTIVE', id: { notIn: [...routed] }, aircraft: { some: { ...QUOTABLE_AIRCRAFT_WHERE, seats: { gte: rfq.passengers } } } }, select: { id: true, legalName: true } })
    : [];
  return (
    <>
      <PageHeader eyebrow={<span className="strip">{rfq.reference}</span>} title={<span className="strip">{routeSummary(rfq.legs)}</span>} actions={<Status kind="rfq" value={rfq.status} />} />
      <div className="grid gap-12 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-12">
          <Itinerary legs={rfq.legs} />
          <section>
            <SectionTitle>Quotes (internal view)</SectionTitle>
            {rfq.quotes.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
              <Table head={['Operator', 'Aircraft', 'Operator price', 'Fee', 'Customer price', 'Status']}>
                {rfq.quotes.map((q) => {
                  const r = q.revisions[0]!;
                  return (
                    <tr key={q.id}>
                      <td className="text-sm">{q.operator.legalName}</td>
                      <td className="strip">{q.aircraft.registration}</td>
                      <td className="strip">{formatMoney(r.operatorPrice.toString(), r.currency)}</td>
                      <td className="strip">{formatMoney(r.platformFee.toString(), r.currency)}</td>
                      <td className="strip">{formatMoney(r.customerPrice.toString(), r.currency)}</td>
                      <td><Status kind="quote" value={q.status} /></td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-10">
          <section>
            <SectionTitle>Customer</SectionTitle>
            <DL items={[['Account', `${rfq.customer.name} · ${rfq.customer.email}`], ['Contact', `${rfq.contactName}${rfq.contactPhone ? ` · ${rfq.contactPhone}` : ''}`], ['Pax', rfq.passengers], ['Notes', rfq.requirements], ['Expires', formatDateTime(rfq.expiresAt)], ['Booking', rfq.booking ? <Link key="b" className="strip underline" href={`/admin/bookings/${rfq.booking.reference}`}>{rfq.booking.reference}</Link> : null]]} />
          </section>
          <section>
            <SectionTitle>Routed to</SectionTitle>
            <ul className="text-sm">
              {rfq.recipients.length === 0 && <li className="text-muted">No operator matched automatically.</li>}
              {rfq.recipients.map((r) => <li key={r.id} className="border-b border-line py-2"><Link className="underline" href={`/admin/operators/${r.operator.id}`}>{r.operator.legalName}</Link> · {r.status.toLowerCase()}<span className="block text-xs text-muted">{r.matchReason}{r.declineReason ? ` · declined: ${r.declineReason}` : ''}</span></li>)}
            </ul>
            {can(v, 'rfq.route') && ['MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'].includes(rfq.status) && (
              candidates.length === 0 ? <p className="mt-4 text-sm text-muted">No other active operator has an eligible aircraft.</p> : (
                <ActionForm action={routeRfqAction} className="mt-5 flex flex-col gap-4">
                  <input type="hidden" name="rfqId" value={rfq.id} />
                  <input type="hidden" name="reference" value={rfq.reference} />
                  <Field name="operatorId" label="Route to another active operator"><Select name="operatorId" required defaultValue="">{[<option key="" value="">Choose…</option>, ...candidates.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)]}</Select></Field>
                  <SubmitButton variant="secondary">Route request</SubmitButton>
                </ActionForm>
              )
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
