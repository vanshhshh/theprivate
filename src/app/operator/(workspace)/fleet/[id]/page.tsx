import Image from 'next/image';
import { notFound } from 'next/navigation';
import { AircraftFields } from '@/components/domain/aircraft-form';
import { Status } from '@/components/domain/status';
import { DL, Notice, PageHeader, Pill, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/time';
import { AVAILABILITY_FRESHNESS_DAYS } from '@/domain/charter/eligibility';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { aircraftTypeOptions, getFleetAircraft } from '@/server/services/fleet';
import { availabilityAction, availabilityOpAction, imageAction, operationalStatusAction, pricingAction, submitAircraftAction, updateAircraftAction } from '../../../actions';

export default async function AircraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { operatorId, membership } = await requireOperatorPage(`/operator/fleet/${id}`);
  const [a, types] = await Promise.all([getFleetAircraft(operatorId, id), aircraftTypeOptions()]);
  if (!a) notFound();
  const manager = hasRole(membership.role, 'MANAGER');
  const rule = a.pricingRules[0];
  const homeBase = a.homeBase ? { id: a.homeBase.id, icao: a.homeBase.icao, iata: a.homeBase.iata, name: a.homeBase.name, city: a.homeBase.city, countryCode: a.homeBase.countryCode, lat: Number(a.homeBase.latitude), lon: Number(a.homeBase.longitude) } : null;
  const staleBefore = Date.now() - AVAILABILITY_FRESHNESS_DAYS * 86_400_000;
  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title={<span className="strip">{a.registration}</span>}
        lede={a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : a.modelRaw ?? undefined}
        actions={<><Status kind="aircraftReview" value={a.reviewStatus} /><Status kind="evidence" value={a.evidenceLevel} />{a.charterEligible && <Pill tone="verified">Charter enabled</Pill>}</>}
      />
      {a.reviewStatus === 'IMPORTED_UNREVIEWED' && (
        <div className="mb-8"><Notice tone="warning" title="Imported from a public record">
          Source: {a.sourceStatusRaw ?? 'public record'}{a.sourceNote ? ` · ${a.sourceNote}` : ''}. Check the details below and save to confirm this aircraft is in your fleet. Then submit it for review.
          {a.attributionUncertain && ' The source row was corrupted, so ThePrivate will also confirm ownership with you.'}
        </Notice></div>
      )}
      {a.reviewStatus === 'REJECTED' && <div className="mb-8"><Notice tone="danger">Changes were requested. Check your inbox for the reviewer’s note, update the details and resubmit.</Notice></div>}

      <div className="grid gap-14 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle>Details</SectionTitle>
          <ActionForm action={updateAircraftAction} className="flex flex-col gap-8">
            <input type="hidden" name="id" value={a.id} />
            <AircraftFields types={types} lockRegistration initial={{ registration: a.registration, aircraftTypeId: a.aircraftTypeId, seats: a.seats, yearOfManufacture: a.yearOfManufacture, serialNumber: a.serialNumber, homeBase, publicDescription: a.publicDescription, modelRaw: a.modelRaw }} />
            {manager && <SubmitButton variant="secondary" className="self-start">{a.reviewStatus === 'IMPORTED_UNREVIEWED' ? 'Confirm & save' : 'Save changes'}</SubmitButton>}
          </ActionForm>
          {manager && a.reviewStatus === 'DRAFT' && (
            <div className="mt-8 border-t border-line pt-6">
              <InlineAction action={submitAircraftAction} hidden={{ id: a.id }} label="Submit for review" variant="primary" confirm="Submit this aircraft to ThePrivate for approval? Our team may ask for registration and airworthiness documents." />
            </div>
          )}

          <div className="mt-14">
            <SectionTitle>Photos</SectionTitle>
            {a.images.length === 0 ? <p className="text-sm text-muted">No photos yet.</p> : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {a.images.map((img) => (
                  <li key={img.id} className="relative aspect-[4/3] overflow-hidden bg-paper-2">
                    <Image src={`/api/files/${img.documentId}`} alt={img.alt} fill sizes="(min-width: 768px) 30vw, 50vw" className="object-cover" unoptimized />
                    {!img.isApproved && <span className="absolute left-2 top-2"><Pill tone="indicative">Not public yet</Pill></span>}
                  </li>
                ))}
              </ul>
            )}
            {manager && (
              <ActionForm action={imageAction} resetOnSuccess className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={a.id} />
                <Field name="photo" label="Add photo" hint="JPG, PNG or WebP · max 10 MB"><Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="border-0 text-sm" /></Field>
                <Field name="alt" label="Describe the photo"><Input name="alt" placeholder="Cabin, forward view" /></Field>
                <SubmitButton variant="secondary">Upload</SubmitButton>
              </ActionForm>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-12">
          <section>
            <SectionTitle>Operational status</SectionTitle>
            <ActionForm action={operationalStatusAction} className="flex items-end gap-4">
              <input type="hidden" name="id" value={a.id} />
              <Field name="status" label="Status" className="flex-1">
                <Select name="status" defaultValue={a.operationalStatus}>
                  {['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED', 'UNKNOWN'].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                </Select>
              </Field>
              <SubmitButton variant="secondary">Update</SubmitButton>
            </ActionForm>
          </section>

          <section>
            <SectionTitle aside={`Re-confirm every ${AVAILABILITY_FRESHNESS_DAYS} days`}>Availability</SectionTitle>
            <p className="mb-4 text-sm text-muted">Customers see “operator-declared available” only for windows you re-confirmed recently. Dates are local to the home base.</p>
            <ul className="divide-y divide-line">
              {a.availability.length === 0 && <li className="py-3 text-sm text-muted">No upcoming windows.</li>}
              {a.availability.map((w) => (
                <li key={w.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between">
                    <span className="strip text-sm">{formatDate(w.startsAt)} → {formatDate(w.endsAt)}</span>
                    <Pill tone={w.kind === 'AVAILABLE' ? (w.confirmedAt.getTime() < staleBefore ? 'unconfirmed' : 'verified') : 'danger'}>{w.kind === 'AVAILABLE' && w.confirmedAt.getTime() < staleBefore ? 'Stale' : w.kind.toLowerCase()}</Pill>
                  </div>
                  <p className="text-xs text-muted">Confirmed {formatDateTime(w.confirmedAt)}{w.note ? ` · ${w.note}` : ''}</p>
                  <div className="flex gap-3">
                    <InlineAction action={availabilityOpAction} hidden={{ id: a.id, windowId: w.id, op: 'confirm' }} label="Re-confirm" variant="ghost" />
                    <InlineAction action={availabilityOpAction} hidden={{ id: a.id, windowId: w.id, op: 'delete' }} label="Remove" variant="ghost" confirm="Remove this window?" />
                  </div>
                </li>
              ))}
            </ul>
            <ActionForm action={availabilityAction} resetOnSuccess className="mt-5 grid grid-cols-2 gap-4">
              <input type="hidden" name="id" value={a.id} />
              <Field name="kind" label="Type" className="col-span-2">
                <Select name="kind" defaultValue="AVAILABLE"><option value="AVAILABLE">Available</option><option value="BLOCKED">Blocked</option><option value="MAINTENANCE">Maintenance</option></Select>
              </Field>
              <Field name="startDate" label="From"><Input name="startDate" type="date" required /></Field>
              <Field name="endDate" label="To"><Input name="endDate" type="date" required /></Field>
              <Field name="note" label="Note" className="col-span-2"><Input name="note" /></Field>
              <SubmitButton variant="secondary" className="col-span-2 justify-self-start">Add window</SubmitButton>
            </ActionForm>
          </section>

          {manager && (
            <section>
              <SectionTitle>Hourly rate (confidential)</SectionTitle>
              {rule && <DL items={[['Current', <span key="r" className="strip">{formatMoney(rule.hourlyRate.toString(), rule.currency)} / h</span>], ['Minimum', `${rule.minimumBillableHours.toString()} h`]]} />}
              <p className="my-4 text-sm text-muted">Never shown to customers. Used only to give an indicative range, and only when this type’s cruise speed is verified. Quotes are always your own figure.</p>
              <ActionForm action={pricingAction} className="grid grid-cols-2 gap-4">
                <input type="hidden" name="id" value={a.id} />
                <Field name="hourlyRate" label="Rate per block hour"><Input name="hourlyRate" inputMode="decimal" defaultValue={rule?.hourlyRate.toString() ?? ''} required className="strip" /></Field>
                <Field name="currency" label="Currency"><Select name="currency" defaultValue={rule?.currency ?? 'INR'}>{['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
                <Field name="minimumBillableHours" label="Minimum hours"><Input name="minimumBillableHours" defaultValue={rule?.minimumBillableHours.toString() ?? '1'} required className="strip" /></Field>
                <SubmitButton variant="secondary" className="col-span-2 justify-self-start">Save rate</SubmitButton>
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
