import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Status } from '@/components/domain/status';
import { DL, PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { saleListingLifecycle } from '@/domain/lifecycle';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { enquiryStatusAction, leadStageAction, saleReviewAction } from '../../actions';

export default async function AdminListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage('sale.review', `/admin/sales/${id}`);
  const l = await prisma.saleListing.findUnique({ where: { id }, include: { seller: { select: { name: true, email: true } }, media: { include: { document: { select: { id: true, fileName: true, mimeType: true } } }, orderBy: { sortOrder: 'asc' } }, enquiries: { orderBy: { createdAt: 'desc' } }, reviewEvents: { orderBy: { createdAt: 'desc' } }, lead: true } });
  if (!l) notFound();
  const next = saleListingLifecycle.next(l.status, 'STAFF') as ('PUBLISHED' | 'REJECTED' | 'NEEDS_INFO' | 'WITHDRAWN' | 'SOLD' | 'IN_REVIEW')[];
  const photos = l.media.filter((m) => !m.caption);
  const docs = l.media.filter((m) => m.caption);
  return (
    <>
      <PageHeader eyebrow="Sales desk" title={`${l.yearOfManufacture} ${l.manufacturer} ${l.model}`} lede={l.headline} actions={<Status kind="listing" value={l.status} />} />
      <div className="grid gap-12 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-12">
          {photos.length > 0 && <div className="grid grid-cols-3 gap-3">{photos.map((m) => <div key={m.id} className="relative aspect-[4/3] bg-paper-2"><Image src={`/api/files/${m.documentId}`} alt="" fill sizes="20vw" className="object-cover" unoptimized /></div>)}</div>}
          <DL items={[
            ['Category', l.category], ['Registration', l.registration], ['Serial', l.serialNumber], ['Total time', l.totalTimeHours], ['Landings', l.landings], ['Location', l.locationText],
            ['Price', l.priceOnRequest || !l.askingPrice ? 'On request' : formatMoney(l.askingPrice.toString(), l.currency, 'en-US')],
            ['Documents', docs.length ? docs.map((d) => <a key={d.id} className="mr-3 underline" href={`/api/files/${d.document.id}`}>{d.document.fileName}</a>) : null],
          ]} />
          <p className="whitespace-pre-line text-ink-2">{l.description}</p>
          <section>
            <SectionTitle>Buyer enquiries ({l.enquiries.length})</SectionTitle>
            <Table head={['When', 'Buyer', 'Type', 'Message', 'Status']}>
              {l.enquiries.map((e) => (
                <tr key={e.id}>
                  <td className="strip text-xs">{formatDateTime(e.createdAt)}</td>
                  <td className="text-sm">{e.name}<span className="block text-xs text-muted">{e.email}{e.phone ? ` · ${e.phone}` : ''}</span></td>
                  <td className="text-xs">{e.type.toLowerCase().replace('_', ' ')}</td>
                  <td className="max-w-72 text-sm">{e.message}</td>
                  <td>
                    <ActionForm action={enquiryStatusAction} className="flex gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="enquiryId" value={e.id} />
                      <Select name="status" defaultValue={e.status} className="text-sm">{['NEW', 'FORWARDED', 'RESPONDED', 'CONVERTED', 'CLOSED'].map((s) => <option key={s}>{s}</option>)}</Select>
                      <SubmitButton variant="ghost" className="h-8 px-2 text-xs">Save</SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </Table>
          </section>
        </div>
        <aside className="flex flex-col gap-10">
          <section>
            <SectionTitle>Seller (private)</SectionTitle>
            <DL items={[['Account', `${l.seller.name} · ${l.seller.email}`], ['Contact', `${l.contactName} · ${l.contactEmail}${l.contactPhone ? ` · ${l.contactPhone}` : ''}`], ['Type', l.sellerType.toLowerCase()]]} />
          </section>
          <section className="flex flex-col gap-3">
            <SectionTitle>Review</SectionTitle>
            {next.includes('PUBLISHED') && <InlineAction action={saleReviewAction} hidden={{ id: l.id, to: 'PUBLISHED' }} label="Approve & publish" variant="primary" reason={{ label: 'Note to seller (optional)', name: 'note' }} />}
            {next.includes('NEEDS_INFO') && <InlineAction action={saleReviewAction} hidden={{ id: l.id, to: 'NEEDS_INFO' }} label="Request information" reason={{ label: 'What is needed?', required: true, name: 'note' }} />}
            {next.includes('REJECTED') && <InlineAction action={saleReviewAction} hidden={{ id: l.id, to: 'REJECTED' }} label="Reject" variant="danger" reason={{ label: 'Reason', required: true, name: 'note' }} />}
            {next.includes('SOLD') && <InlineAction action={saleReviewAction} hidden={{ id: l.id, to: 'SOLD' }} label="Mark sold" reason={{ label: 'Note', required: true, name: 'note' }} />}
            {next.includes('WITHDRAWN') && <InlineAction action={saleReviewAction} hidden={{ id: l.id, to: 'WITHDRAWN' }} label="Unpublish" variant="danger" reason={{ label: 'Reason', required: true, name: 'note' }} />}
          </section>
          {l.lead && (
            <section>
              <SectionTitle>Seller lead</SectionTitle>
              <ActionForm action={leadStageAction} className="flex flex-col gap-4">
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="leadId" value={l.lead.id} />
                <Field name="stage" label="Stage"><Select name="stage" defaultValue={l.lead.stage}>{['NEW', 'CONTACTED', 'QUALIFIED', 'LISTED', 'CLOSED_WON', 'CLOSED_LOST'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field name="notes" label="Notes"><Textarea name="notes" rows={3} defaultValue={l.lead.notes ?? ''} /></Field>
                <SubmitButton variant="secondary">Save lead</SubmitButton>
              </ActionForm>
            </section>
          )}
          <section>
            <SectionTitle>History</SectionTitle>
            <ul className="text-xs">{l.reviewEvents.map((e) => <li key={e.id} className="border-b border-line py-1.5"><span className="strip">{formatDateTime(e.createdAt)}</span> · {e.fromStatus ?? '—'} → {e.toStatus}{e.note ? ` · ${e.note}` : ''}</li>)}</ul>
          </section>
        </aside>
      </div>
    </>
  );
}
