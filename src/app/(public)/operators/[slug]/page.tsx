import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SceneHero } from '@/components/cinematic/scene';
import { categoryLabel } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { DL, SectionTitle } from '@/components/ui/display';
import { formatDate } from '@/lib/time';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  return prisma.operator.findFirst({
    where: { slug, isPubliclyListed: true, deletedAt: null, lifecycle: { in: ['VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE'] } },
    include: {
      authorizations: { where: { verifiedAt: { not: null } } },
      aircraft: { where: { reviewStatus: 'APPROVED', charterEligible: true, deletedAt: null }, include: { aircraftType: true, homeBase: { select: { iata: true, icao: true, city: true } }, images: { where: { isApproved: true }, take: 1, orderBy: { sortOrder: 'asc' } } } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const op = await load((await params).slug);
  return op ? { title: op.displayName, description: op.publicDescription?.slice(0, 160) } : { title: 'Flight partner' };
}

export default async function OperatorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const op = await load((await params).slug);
  if (!op) notFound();
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Organization', name: op.displayName, ...(op.website ? { url: op.website } : {}), description: op.publicDescription ?? undefined };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SceneHero scene="jet-inflight" size="band" eyebrow="Flight partner · checked by ThePrivate" title={op.displayName} lede={op.baseDescription ?? undefined}>
        <LinkButton href="/charter" variant="light" arrow>Plan a flight</LinkButton>
      </SceneHero>
      <div className="mx-auto grid max-w-[1320px] gap-16 px-5 py-20 md:px-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {op.publicDescription && <p className="whitespace-pre-line text-[19px] leading-[1.65] text-ink-2">{op.publicDescription}</p>}
          <section className="mt-14">
            <SectionTitle>Aircraft you can request</SectionTitle>
            {op.aircraft.length === 0 ? <p className="text-muted">No aircraft are available to request yet.</p> : (
              <ul className="grid gap-10 sm:grid-cols-2">
                {op.aircraft.map((a, i) => (
                  <Reveal as="li" key={a.id} index={i}>
                    <div className="img-reveal relative aspect-[4/3] overflow-hidden rounded-sm bg-night">
                      {a.images[0] ? (
                        <Image src={`/api/files/${a.images[0].documentId}`} alt={a.images[0].alt} fill sizes="(min-width:640px) 30vw, 100vw" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-end p-6 text-[12px] text-paper/50">Photos not yet provided</div>
                      )}
                    </div>
                    <p className="font-display mt-4 text-[26px] leading-tight">{a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : a.modelRaw}</p>
                    <p className="mt-1 text-[15px] text-muted">{categoryLabel(a.aircraftType?.category)} · {a.seats} seats{a.homeBase ? ` · based at ${a.homeBase.city ?? a.homeBase.iata ?? a.homeBase.icao}` : ''}</p>
                  </Reveal>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm bg-paper-2/70 p-7">
            <SectionTitle>Checked by ThePrivate</SectionTitle>
            <DL items={[
              ...op.authorizations.map((a) => [`Operating licence (${a.authority})`, <span key={a.id}><span className="strip">{a.numberRaw}</span>{a.validUntil ? ` · valid until ${formatDate(a.validUntil)}` : ''}</span>] as [string, React.ReactNode]),
              ['Website', op.website ? <a key="w" href={op.website} rel="noopener noreferrer nofollow" target="_blank" className="link-draw">{new URL(op.website).hostname}</a> : null],
            ]} />
            <p className="mt-6 text-[13px] leading-relaxed text-muted">Licence checked against the regulator&apos;s record. Availability and prices are confirmed in each offer.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
