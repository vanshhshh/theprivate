import { PLATES } from '@/components/Plate';
import { InBuild, ScreenHero } from '@/components/ScreenHero';

export function Explore() {
  return (
    <>
      <ScreenHero plate={PLATES.jetsRamp} eyebrow="Explore" title={<>One-way offers <em>&amp; aircraft.</em></>} />
      <InBuild items={['Live one-way offers from flight partners', 'Aircraft for sale with photos and specifications', 'Enquiries without exposing anyone’s contact details', 'Share public listings']} />
    </>
  );
}
