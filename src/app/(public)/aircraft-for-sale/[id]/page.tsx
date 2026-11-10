import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { HeaderOver } from '@/components/cinematic/header-over';
import { categoryLabel } from '@/components/domain/status';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { formatMoney } from '@/lib/money';
import { getViewer } from '@/server/auth/viewer';
import { getPublishedListing } from '@/server/services/sales';
import { buyerEnquiryAction } from '../../actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = await getPublishedListing((await params).id);
  return l ? { title: `${l.yearOfManufacture} ${l.manufacturer} ${l.model} for sale`, description: l.headline } : { title: 'Listing not found' };
}

export default async function Listing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, v] = await Promise.all([getPublishedListing(id), getViewer()]);
  if (!l) notFound();
  const photos = l.media.filter((m) => !m.caption);
  const price = l.priceOnRequest || !l.askingPrice ? 'Price on request' : formatMoney(l.askingPrice.toString(), l.currency, 'en-US');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${l.yearOfManufacture} ${l.manufacturer} ${l.model}`,
    description: l.headline,
    brand: l.manufacturer,
    ...(l.askingPrice && !l.priceOnRequest ? { offers: { '@type': 'Offer', price: l.askingPrice.toString(), priceCurrency: l.currency, availability: 'https://schema.org/InStock' } } : {}),
  };
  const spec: [string, React.ReactNode][] = [
    ['Year', l.yearOfManufacture],
    ['Type', categoryLabel(l.category)],
    ['Hours flown', l.totalTimeHours != null ? `${l.totalTimeHours.toLocaleString('en-IN')} hours` : null],
    ['Landings', l.landings?.toLocaleString('en-IN') ?? null],
    ['Located', l.locationText],
    ['Registration', l.registration ? <span key="r" className="strip">{l.registration}</span> : null],
    ['Serial number', l.serialNumber ? <span key="s" className="strip">{l.serialNumber}</span> : null],
    ['Offered by', `The ${l.sellerType.toLowerCase()}`],
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="relative isolate -mt-16 flex min-h-[78svh] flex-col overflow-hidden bg-night text-paper">
        <HeaderOver />
        {photos[0] && (
          <div className="absolute inset-0">
            <Image src={`/api/files/${photos[0].documentId}`} alt={`${l.manufacturer} ${l.model}`} fill sizes="100vw" className="scene-settle object-cover" priority unoptimized />
          </div>
        )}
        <div aria-hidden className="scene-grade absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-end px-5 pb-14 pt-32 md:px-12">
          <p className="resolve-late strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk">{l.yearOfManufacture} · {categoryLabel(l.category)} · for sale</p>
          <h1 className="font-display max-w-4xl text-[48px] leading-[0.98] md:text-[96px]">{l.manufacturer} {l.model}</h1>
          <div className="resolve-late mt-6 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-xl text-[17px] leading-relaxed text-paper/85">{l.headline}</p>
            <p className="strip text-[26px]">{price}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] gap-16 px-5 py-20 md:px-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <article>
          <p className="strip mb-6 text-[11px] uppercase tracking-[0.22em] text-magenta">Specification · as provided by the seller</p>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line sm:grid-cols-4">
            {spec.map(([k, val]) => (
              <div key={k} className="bg-paper p-5">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="mt-2 text-[17px]">{val ?? <span className="text-muted">Not provided</span>}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-14 max-w-2xl whitespace-pre-line text-[18px] leading-[1.7] text-ink-2 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[64px] first-letter:leading-[0.85] first-letter:text-ink">{l.description}</div>

          {photos.length > 1 && (
            <div className="mt-16 grid gap-4 sm:grid-cols-2">
              {photos.slice(1, 9).map((p, i) => (
                <div key={p.documentId} className={`img-reveal relative overflow-hidden rounded-sm bg-paper-2 ${i % 3 === 0 ? 'aspect-[16/10] sm:col-span-2' : 'aspect-[4/3]'}`}>
                  <Image src={`/api/files/${p.documentId}`} alt={`${l.manufacturer} ${l.model}, photo ${i + 2}`} fill sizes="(min-width:640px) 45vw, 100vw" className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}
          {photos.length === 0 && <p className="mt-12 text-[15px] text-muted">The seller has not provided photos yet. Ask for them in your enquiry.</p>}
          <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-muted">ThePrivate reviews every listing for completeness but does not inspect aircraft. Before buying, arrange a pre-purchase inspection and a title search.</p>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm bg-paper-2/70 p-7 md:p-9">
            <h2 className="font-display text-[32px] leading-tight">Ask about <em>this aircraft</em></h2>
            <p className="mt-2 mb-8 text-[15px] text-ink-2">We introduce you to the seller. Their details stay private until both sides agree.</p>
            <ActionForm action={buyerEnquiryAction} resetOnSuccess className="grid gap-6">
              <input type="hidden" name="listingId" value={l.id} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <Field name="type" label="I would like to">
                <Select name="type" defaultValue="REQUEST_INFO"><option value="REQUEST_INFO">Receive more information</option><option value="VIEWING">Arrange a viewing</option><option value="PURCHASE_INTEREST">Discuss buying it</option><option value="GENERAL">Ask a question</option></Select>
              </Field>
              <Field name="name" label="Name"><Input name="name" defaultValue={v?.user.name ?? ''} required autoComplete="name" /></Field>
              <Field name="email" label="E-mail"><Input name="email" type="email" defaultValue={v?.user.email ?? ''} required autoComplete="email" /></Field>
              <Field name="phone" label="Phone (optional)"><Input name="phone" type="tel" autoComplete="tel" /></Field>
              <Field name="message" label="Message"><Textarea name="message" rows={4} required /></Field>
              <SubmitButton className="w-full">Send enquiry</SubmitButton>
            </ActionForm>
          </div>
        </aside>
      </div>
    </>
  );
}
