import type { Metadata } from 'next';
import Link from 'next/link';
import { SceneEmpty, SceneHero } from '@/components/cinematic/scene';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { prisma } from '@/server/db/client';

export const metadata: Metadata = { title: 'Our flight partners', description: 'The licensed air operators that fly with ThePrivate, each checked before appearing.' };
export const dynamic = 'force-dynamic';

export default async function Operators() {
  const listed = await prisma.operator.findMany({ where: { isPubliclyListed: true, deletedAt: null, lifecycle: { in: ['VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE'] } }, orderBy: { displayName: 'asc' }, include: { _count: { select: { aircraft: { where: { reviewStatus: 'APPROVED', charterEligible: true } } } } } });
  return (
    <>
      <SceneHero scene="jet-inflight" size="band" eyebrow="Our flight partners" title="The people" titleItalic="who fly you." lede="Licensed air operators, each checked by ThePrivate before appearing here." />
      <section className="mx-auto max-w-[1320px] px-5 pt-16 md:px-12">
        {listed.length === 0 ? (
          <SceneEmpty scene="cabin-aisle" eyebrow="Flight partners" title={<>Introductions <em>coming soon.</em></>} action={<LinkButton href="/charter" variant="light" size="lg" arrow>Plan a flight</LinkButton>}>
            Partners appear here once checked and ready to be listed. Your flight request already reaches them.
          </SceneEmpty>
        ) : (
          <ul className="flex flex-col">
            {listed.map((o, i) => (
              <Reveal as="li" key={o.id} index={i} className="border-t border-line first:border-ink">
                <Link href={`/operators/${o.slug}`} className="group flex flex-wrap items-end justify-between gap-6 py-8">
                  <div>
                    <h2 className="font-display text-[34px] leading-none transition-colors group-hover:text-magenta md:text-[44px]">{o.displayName}</h2>
                    <p className="mt-3 text-[15px] text-ink-2">{o.baseDescription ?? o.countryCode} · {o._count.aircraft} aircraft available to request</p>
                  </div>
                  <span aria-hidden className="grid size-11 place-items-center rounded-full border border-ink/30 transition-colors group-hover:border-magenta group-hover:bg-magenta group-hover:text-paper">→</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
        <p className="mt-12 text-[15px] text-ink-2">
          Run an air operator? <Link href="/for-operators" className="link-draw text-ink">Partner with ThePrivate</Link>
        </p>
      </section>
    </>
  );
}
