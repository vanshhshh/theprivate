import { PLATES } from '@/components/Plate';
import { InBuild, ScreenHero } from '@/components/ScreenHero';

export function Journeys() {
  return (
    <>
      <ScreenHero plate={PLATES.cabinWarm} eyebrow="My journeys" title={<>Every trip, <em>in one place.</em></>} />
      <InBuild items={['Upcoming trips with local departure times', 'Flight requests and the offers you receive', 'Side-by-side offer comparison with explicit acceptance', 'Booking details, documents and updates']} />
    </>
  );
}
