import { PLATES } from '@/components/Plate';
import { InBuild, ScreenHero } from '@/components/ScreenHero';

export function Plan() {
  return (
    <>
      <ScreenHero plate={PLATES.jetInFlight} eyebrow="Plan a flight" title={<>Your route, <em>your time.</em></>} />
      <InBuild items={['From and to: airport search by name, city, IATA or ICAO', 'One-way or return, date and optional time', 'Passengers and preferred aircraft category', 'Results from verified flight partners, or a request we fulfil for you']} />
    </>
  );
}
