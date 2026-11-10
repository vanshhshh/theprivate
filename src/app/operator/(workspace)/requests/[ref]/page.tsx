import { notFound } from 'next/navigation';
import { Itinerary, routeSummary } from '@/components/domain/itinerary';
import { categoryLabel, Status } from '@/components/domain/status';
import { DL, Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { QUOTABLE_AIRCRAFT_WHERE } from '@/domain/charter/eligibility';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { getOperatorRfq, markRecipientViewed } from '@/server/services/quotes';
import { getSetting } from '@/server/settings';
import { declineRfqAction, quoteAction, withdrawQuoteAction } from '../../../actions';

export const dynamic = 'force-dynamic';

function QuoteFields({ aircraft, defaults }: { aircraft: { id: string; registration: string; seats: number | null; label: string }[]; defaults?: { aircraftId: string; operatorPrice: string; inclusions: string; exclusions: string; terms: string; validHours: number } }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {defaults ? <input type="hidden" name="aircraftId" value={defaults.aircraftId} /> : (
        <Field name="aircraftId" label="Aircraft" className="md:col-span-2">
          <Select name="aircraftId" required defaultValue="">
            <option value="">Choose an approved aircraft…</option>
            {aircraft.map((a) => <option key={a.id} value={a.id}>{a.registration} · {a.label} · {a.seats} seats</option>)}
          </Select>
        </Field>
      )}
      <Field name="operatorPrice" label="Your price (all legs)" hint="What you will be paid. ThePrivate adds its fee on top."><Input name="operatorPrice" inputMode="decimal" required defaultValue={defaults?.operatorPrice} className="strip" /></Field>
      <Field name="validHours" label="Valid for (hours)"><Input name="validHours" type="number" min={1} max={336} defaultValue={defaults?.validHours ?? 48} required className="strip" /></Field>
      <Field name="inclusions" label="Includes (one per line)"><Textarea name="inclusions" rows={4} defaultValue={defaults?.inclusions ?? 'Crew\nFuel\nLanding & parking fees\nStandard catering'} /></Field>
      <Field name="exclusions" label="Excludes (one per line)"><Textarea name="exclusions" rows={4} defaultValue={defaults?.exclusions ?? 'De-icing\nOvernight crew costs beyond schedule'} /></Field>
      <Field name="terms" label="Terms & notes" className="md:col-span-2"><Textarea name="terms" rows={3} defaultValue={defaults?.terms} placeholder="Cancellation terms, routing assumptions, fuel-stop notes…" /></Field>
    </div>
  );
}

export default async function OperatorRequest({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { operatorId } = await requireOperatorPage(`/operator/requests/${ref}`);
  const rfq = await getOperatorRfq(operatorId, ref);
  if (!rfq) notFound();
  await markRecipientViewed(operatorId, rfq.id);
  const [fleet, agreement, defaultValidity] = await Promise.all([
    prisma.aircraft.findMany({ where: { ...QUOTABLE_AIRCRAFT_WHERE, operatorId, seats: { gte: rfq.passengers } }, include: { aircraftType: { select: { manufacturer: true, model: true } } } }),
    prisma.agreement.findFirst({ where: { operatorId, status: 'SIGNED' }, orderBy: { version: 'desc' } }),
    getSetting('quote.defaultValidityHours'),
  ]);
  const quoted = new Set(rfq.quotes.map((q) => q.aircraftId));
  const available = fleet.filter((a) => !quoted.has(a.id)).map((a) => ({ id: a.id, registration: a.registration, seats: a.seats, label: a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : a.modelRaw ?? '' }));
  const open = ['AWAITING_QUOTES', 'QUOTES_AVAILABLE', 'MATCHING'].includes(rfq.status) && rfq.expiresAt > new Date();
  const recipient = rfq.recipients[0]!;
  return (
    <>
      <PageHeader eyebrow={<span className="strip">{rfq.reference}</span>} title={<span className="strip">{routeSummary(rfq.legs)}</span>} lede={`${rfq.passengers} passengers · ${rfq.tripType.replace('_', ' ').toLowerCase()}${rfq.categoryPreference ? ` · prefers ${categoryLabel(rfq.categoryPreference).toLowerCase()}` : ''}`} actions={<Status kind="rfq" value={rfq.status} />} />
      <div className="grid gap-12 xl:grid-cols-[1fr_380px]">
        <div>
          <SectionTitle>Itinerary</SectionTitle>
          <Itinerary legs={rfq.legs} />
          {rfq.requirements && <div className="mt-6"><Notice title="Customer notes">{rfq.requirements}</Notice></div>}
          {rfq.petsOnBoard && <p className="mt-3 text-sm">Travelling with pets.</p>}

          {rfq.quotes.length > 0 && (
            <section className="mt-12">
              <SectionTitle>Your quotes</SectionTitle>
              <ul className="flex flex-col gap-8">
                {rfq.quotes.map((q) => {
                  const r = q.revisions[0]!;
                  const canRevise = ['SUBMITTED', 'REVISED'].includes(q.status) && rfq.status === 'QUOTES_AVAILABLE';
                  return (
                    <li key={q.id} className="border-t border-ink pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="strip">{q.aircraft.registration} · revision {r.revision}</p>
                        <Status kind="quote" value={q.status} />
                      </div>
                      <DL items={[
                        ['Your price', <span key="o" className="strip">{formatMoney(r.operatorPrice.toString(), r.currency)}</span>],
                        ['Customer sees', <span key="c" className="strip">{formatMoney(r.customerPrice.toString(), r.currency)}{Number(r.taxes) > 0 ? ' incl. taxes' : ''}</span>],
                        ['Valid until', formatDateTime(r.validUntil)],
                      ]} />
                      {canRevise && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm text-sectional underline underline-offset-4">Revise this quote</summary>
                          <ActionForm action={quoteAction} className="mt-5 flex flex-col gap-6">
                            <input type="hidden" name="reference" value={rfq.reference} />
                            <input type="hidden" name="quoteId" value={q.id} />
                            <QuoteFields aircraft={[]} defaults={{ aircraftId: q.aircraftId, operatorPrice: r.operatorPrice.toString(), inclusions: r.inclusions.join('\n'), exclusions: r.exclusions.join('\n'), terms: r.terms ?? '', validHours: defaultValidity }} />
                            <SubmitButton className="self-start">Send revision</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                      {canRevise && <div className="mt-4"><InlineAction action={withdrawQuoteAction} hidden={{ quoteId: q.id, reference: rfq.reference }} label="Withdraw quote" variant="ghost" confirm="Withdraw this quote? The customer will be notified." /></div>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
        <aside className="flex flex-col gap-8">
          {open && recipient.status !== 'DECLINED' ? (
            <section>
              <SectionTitle>Send a quote</SectionTitle>
              {!agreement ? (
                <Notice tone="warning">You need a signed agreement before quoting.</Notice>
              ) : available.length === 0 ? (
                <Notice tone="warning">None of your approved, active aircraft with ≥ {rfq.passengers} seats is left to quote.</Notice>
              ) : (
                <>
                  <p className="mb-5 text-sm text-muted">The customer sees your price plus ThePrivate’s {(agreement.commissionBps / 100).toFixed(2)} % fee{agreement.minimumFee ? ` (minimum ${agreement.minimumFee.toString()} ${agreement.currency})` : ''}, in {agreement.currency}.</p>
                  <ActionForm action={quoteAction} className="flex flex-col gap-6">
                    <input type="hidden" name="reference" value={rfq.reference} />
                    <QuoteFields aircraft={available} defaults={undefined} />
                    <SubmitButton className="self-start">Send quote</SubmitButton>
                  </ActionForm>
                </>
              )}
              {recipient.status !== 'QUOTED' && (
                <div className="mt-8">
                  <InlineAction action={declineRfqAction} hidden={{ reference: rfq.reference }} label="Decline request" variant="ghost" reason={{ label: 'Reason (helps us route better)' }} />
                </div>
              )}
            </section>
          ) : (
            <Notice>{recipient.status === 'DECLINED' ? 'You declined this request.' : 'This request is closed.'}</Notice>
          )}
        </aside>
      </div>
    </>
  );
}
