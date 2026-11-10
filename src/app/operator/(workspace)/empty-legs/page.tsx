import { AirportCombobox } from '@/components/domain/airport-combobox';
import { Status } from '@/components/domain/status';
import { EmptyState, Notice, PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { QUOTABLE_AIRCRAFT_WHERE } from '@/domain/charter/eligibility';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { emptyLegAction, emptyLegStatusAction, enquiryAction } from '../../actions';

export const metadata = { title: 'Empty legs' };

export default async function OperatorEmptyLegs() {
  const { operatorId, membership } = await requireOperatorPage('/operator/empty-legs');
  const [legs, aircraft, enquiries] = await Promise.all([
    prisma.emptyLegListing.findMany({ where: { operatorId }, orderBy: { windowStartUtc: 'desc' }, take: 100, include: { fromAirport: true, toAirport: true, aircraft: { select: { registration: true } }, _count: { select: { enquiries: true } } } }),
    prisma.aircraft.findMany({ where: { ...QUOTABLE_AIRCRAFT_WHERE, operatorId }, select: { id: true, registration: true, seats: true } }),
    prisma.emptyLegEnquiry.findMany({ where: { listing: { operatorId }, status: { in: ['NEW', 'FORWARDED', 'RESPONDED'] } }, include: { user: { select: { name: true, email: true } }, listing: { include: { fromAirport: true, toAirport: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const active = membership.operator.lifecycle === 'ACTIVE';
  const code = (a: { iata: string | null; icao: string | null }) => a.iata ?? a.icao;
  return (
    <>
      <PageHeader eyebrow="Business" title="Empty legs" lede="List genuine repositioning flights. They go live immediately and expire automatically when the departure window starts." />
      {enquiries.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Enquiries to answer</SectionTitle>
          <Table head={['Flight', 'From', 'Pax', 'Message', 'Status', '']}>
            {enquiries.map((e) => (
              <tr key={e.id}>
                <td className="strip">{code(e.listing.fromAirport)} → {code(e.listing.toAirport)}</td>
                <td>{e.user.name}<span className="block text-xs text-muted">{e.user.email}</span></td>
                <td className="strip">{e.passengers}</td>
                <td className="max-w-64 text-sm">{e.message ?? '—'}</td>
                <td className="text-sm">{e.status.toLowerCase()}</td>
                <td className="flex flex-col gap-2">
                  <InlineAction action={enquiryAction} hidden={{ id: e.id, status: 'RESPONDED' }} label="Mark responded" variant="ghost" />
                  <InlineAction action={enquiryAction} hidden={{ id: e.id, status: 'CLOSED' }} label="Close" variant="ghost" confirm="Close this enquiry?" />
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}
      <div className="grid gap-12 xl:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionTitle>Your listings</SectionTitle>
          {legs.length === 0 ? <EmptyState title="No empty legs listed" /> : (
            <Table head={['Route', 'Window', 'Seats', 'Price', 'Enquiries', 'Status', '']}>
              {legs.map((l) => (
                <tr key={l.id}>
                  <td className="strip">{code(l.fromAirport)} → {code(l.toAirport)}<span className="block text-xs text-muted">{l.aircraft.registration}</span></td>
                  <td className="text-sm">{formatDateTime(l.windowStartUtc, l.fromAirport.timezone ?? 'UTC')}</td>
                  <td className="strip">{l.seatsAvailable}</td>
                  <td className="strip text-sm">{l.customerPrice ? formatMoney(l.customerPrice.toString(), l.currency) : 'On request'}</td>
                  <td className="strip">{l._count.enquiries}</td>
                  <td><Status kind="emptyLeg" value={l.status === 'PUBLISHED' && l.validUntil < new Date() ? 'EXPIRED' : l.status} /></td>
                  <td>{l.status === 'PUBLISHED' && l.validUntil > new Date() && (
                    <div className="flex flex-col gap-2">
                      <InlineAction action={emptyLegStatusAction} hidden={{ id: l.id, to: 'SOLD' }} label="Sold" variant="ghost" confirm="Mark as sold?" />
                      <InlineAction action={emptyLegStatusAction} hidden={{ id: l.id, to: 'WITHDRAWN' }} label="Withdraw" variant="ghost" confirm="Withdraw this listing?" />
                    </div>
                  )}</td>
                </tr>
              ))}
            </Table>
          )}
        </section>
        <section>
          <SectionTitle>List an empty leg</SectionTitle>
          {!active ? <Notice tone="warning">Available once your company is active on ThePrivate.</Notice> : aircraft.length === 0 ? <Notice tone="warning">You need at least one approved, charter-enabled aircraft.</Notice> : !hasRole(membership.role, 'MANAGER') ? <Notice>Managers can publish empty legs.</Notice> : (
            <ActionForm action={emptyLegAction} resetOnSuccess className="grid grid-cols-2 gap-5">
              <Field name="aircraftId" label="Aircraft" className="col-span-2">
                <Select name="aircraftId" required defaultValue="">
                  <option value="">Choose…</option>
                  {aircraft.map((a) => <option key={a.id} value={a.id}>{a.registration} · {a.seats} seats</option>)}
                </Select>
              </Field>
              <div className="col-span-2"><AirportCombobox name="from" label="From" /></div>
              <div className="col-span-2"><AirportCombobox name="to" label="To" /></div>
              <Field name="date" label="Date (local)" className="col-span-2"><Input name="date" type="date" required /></Field>
              <Field name="earliest" label="Earliest departure"><Input name="earliest" type="time" required /></Field>
              <Field name="latest" label="Latest departure"><Input name="latest" type="time" required /></Field>
              <Field name="seatsAvailable" label="Seats offered"><Input name="seatsAvailable" type="number" min={1} required className="strip" /></Field>
              <Field name="operatorPrice" label="Your price (optional)" hint="Blank = price on request"><Input name="operatorPrice" inputMode="decimal" className="strip" /></Field>
              <Field name="notes" label="Notes" className="col-span-2"><Textarea name="notes" rows={2} /></Field>
              <SubmitButton className="col-span-2 justify-self-start">Publish empty leg</SubmitButton>
            </ActionForm>
          )}
        </section>
      </div>
    </>
  );
}
