import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Status } from '@/components/domain/status';
import { DL, Notice, PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Checkbox, Field, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { aircraftReviewAction } from '../../actions';

export default async function AdminAircraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await requirePermissionPage('aircraft.read', `/admin/aircraft/${id}`);
  const a = await prisma.aircraft.findUnique({ where: { id }, include: { operator: true, aircraftType: true, homeBase: true, images: true } });
  if (!a) notFound();
  const [obs, conflicts] = await Promise.all([
    prisma.fieldObservation.findMany({ where: { entityType: 'Aircraft', entityId: id }, orderBy: [{ field: 'asc' }] }),
    prisma.dataConflict.findMany({ where: { entityId: id } }),
  ]);
  const reviewable = ['SUBMITTED', 'IN_REVIEW'].includes(a.reviewStatus) && can(v, 'aircraft.review');
  return (
    <>
      <PageHeader eyebrow="Aircraft" title={<span className="strip">{a.registration}</span>} lede={a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : `Source: ${a.modelRaw ?? '—'}`} actions={<><Status kind="aircraftReview" value={a.reviewStatus} /><Status kind="evidence" value={a.evidenceLevel} /></>} />
      {a.attributionUncertain && <div className="mb-8"><Notice tone="warning">This aircraft came from a corrupted source row; confirm the operator holds it (e.g. registration certificate) before approving.</Notice></div>}
      {conflicts.length > 0 && <div className="mb-8"><Notice tone="danger" title="Open data conflict">{conflicts.map((c) => `${c.field}: ${c.reason}`).join(' · ')}</Notice></div>}
      <div className="grid gap-12 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-12">
          <section>
            <SectionTitle>Details</SectionTitle>
            <DL items={[
              ['Operator', <Link key="o" className="underline" href={`/admin/operators/${a.operatorId}`}>{a.operator.legalName} ({a.operator.lifecycle.toLowerCase()})</Link>],
              ['Type', a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model} · ${a.aircraftType.category}` : `Unresolved (${a.typeResolution.toLowerCase()}${a.typeFamilyHint ? `, family ${a.typeFamilyHint}` : ''})`],
              ['Seats', a.seats ?? (a.seatsRaw ? `Unreadable: “${a.seatsRaw}”` : null)],
              ['Year', a.yearOfManufacture],
              ['Serial', a.serialNumber],
              ['Home base', a.homeBase ? `${a.homeBase.name} (${a.homeBase.icao})` : null],
              ['Operational', a.operationalStatus.toLowerCase()],
              ['Flags', a.dataQualityFlags.join(', ') || null],
              ['Source status', a.sourceStatusRaw],
              ['Source URL', a.sourceUrl ? <a key="u" className="underline" href={a.sourceUrl} rel="noopener noreferrer" target="_blank">{a.sourceUrl}</a> : null],
              ['Charter enabled', a.charterEligible ? 'Yes' : 'No'],
            ]} />
          </section>
          {a.images.length > 0 && (
            <section>
              <SectionTitle>Photos</SectionTitle>
              <div className="grid grid-cols-3 gap-3">{a.images.map((i) => <div key={i.id} className="relative aspect-[4/3] bg-paper-2"><Image src={`/api/files/${i.documentId}`} alt={i.alt} fill sizes="20vw" className="object-cover" unoptimized /></div>)}</div>
            </section>
          )}
          <section>
            <SectionTitle>Provenance (field observations)</SectionTitle>
            {obs.length === 0 ? <p className="text-sm text-muted">Created through the portal; no imported observations.</p> : (
              <Table head={['Field', 'Value', 'Source', 'Confidence']}>
                {obs.map((o) => <tr key={o.id}><td className="text-sm">{o.field}</td><td className="text-sm">{JSON.stringify(o.value)}</td><td className="strip text-xs">{o.sourceCode} › {o.sheet} › r{o.rowNumber}</td><td className="text-xs">{o.confidence.toLowerCase()}</td></tr>)}
              </Table>
            )}
          </section>
        </div>
        <aside>
          <SectionTitle>Review</SectionTitle>
          {reviewable ? (
            <div className="flex flex-col gap-8">
              <ActionForm action={aircraftReviewAction} className="flex flex-col gap-5">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <Checkbox name="charterEligible" value="true" defaultChecked label="Enable for charter quotes" />
                <Field name="note" label="Note to operator (optional)"><Textarea name="note" rows={2} /></Field>
                <SubmitButton>Approve aircraft</SubmitButton>
                <p className="text-xs text-muted">Approval sets evidence to “verified by ThePrivate”, clears the attribution flag and publishes approved photos.</p>
              </ActionForm>
              <InlineAction action={aircraftReviewAction} hidden={{ id: a.id, decision: 'REJECTED' }} label="Request changes" variant="danger" reason={{ label: 'What must change?', required: true, name: 'note' }} />
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing to review. Aircraft are reviewed after the operator submits them.</p>
          )}
        </aside>
      </div>
    </>
  );
}
