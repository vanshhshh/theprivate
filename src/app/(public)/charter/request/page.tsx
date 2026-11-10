import type { Metadata } from 'next';
import { SceneHero } from '@/components/cinematic/scene';
import { RfqForm } from '@/components/domain/rfq-form';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { createRfqAction } from './actions';

export const metadata: Metadata = { title: 'Your flight request' };

type SP = Record<string, string | undefined>;

export default async function RequestPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const v = await requireViewerPage(`/charter/request${qs ? `?${qs}` : ''}`);
  const ids = [sp.from, sp.to].filter(Boolean) as string[];
  const airports = new Map((await prisma.airport.findMany({ where: { id: { in: ids } } })).map((a) => [a.id, { id: a.id, icao: a.icao, iata: a.iata, name: a.name, city: a.city, countryCode: a.countryCode, lat: Number(a.latitude), lon: Number(a.longitude) }]));
  const preferred = sp.aircraft ? await prisma.aircraft.findUnique({ where: { id: sp.aircraft }, select: { registration: true, aircraftType: { select: { manufacturer: true, model: true } } } }) : null;
  return (
    <>
      <SceneHero scene="window-light" size="band" eyebrow="Your flight request" title="Tell us about" titleItalic="your journey." lede="Three short steps. We take it from there." />
      <div className="mx-auto max-w-[1240px] px-5 py-16 md:px-12">
        <RfqForm
          action={createRfqAction}
          defaultName={v.user.name}
          initial={{
            from: sp.from ? airports.get(sp.from) ?? null : null,
            to: sp.to ? airports.get(sp.to) ?? null : null,
            date: sp.date ?? '',
            returnDate: sp.returnDate ?? '',
            pax: Number(sp.pax) || 2,
            category: sp.category ?? '',
            note: preferred ? `Preferred aircraft: ${preferred.aircraftType ? `${preferred.aircraftType.manufacturer} ${preferred.aircraftType.model} ` : ''}(${preferred.registration})` : '',
          }}
        />
      </div>
    </>
  );
}
