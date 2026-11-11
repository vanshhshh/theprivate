/** A licensed photographic plate from the website's media library (synced into the bundle). */
export interface PlateSpec {
  name: string;
  dir: 'film' | 'scenes';
  widths: number[];
  alt: string;
  position?: string;
}

export const PLATES = {
  cabinWindow: { name: 'cabin', dir: 'film', widths: [1280], alt: 'A business-jet cabin with the window looking out over the sky.', position: '62% 50%' },
  jetInFlight: { name: 'jet-inflight', dir: 'scenes', widths: [960, 1600], alt: 'A business jet in flight above the clouds.', position: '55% 50%' },
  jetsRamp: { name: 'jets-ramp', dir: 'scenes', widths: [960, 1600], alt: 'Business jets parked on the ramp.', position: '50% 55%' },
  cabinWarm: { name: 'cabin-warm', dir: 'scenes', widths: [960, 1600], alt: 'A long business-jet cabin in warm light.', position: '50% 50%' },
  skyHorizon: { name: 'sky-horizon', dir: 'film', widths: [1280], alt: '', position: '50% 60%' },
} satisfies Record<string, PlateSpec>;

export function Plate({ plate, className = '', priority = false }: { plate: PlateSpec; className?: string; priority?: boolean }) {
  const src = (w: number) => `/media/${plate.dir}/${plate.name}-${w}.webp`;
  return (
    <img
      src={src(plate.widths[0]!)}
      srcSet={plate.widths.map((w) => `${src(w)} ${w}w`).join(', ')}
      sizes="100vw"
      alt={plate.alt}
      aria-hidden={plate.alt ? undefined : true}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      className={`absolute inset-0 size-full object-cover ${className}`}
      style={{ objectPosition: plate.position }}
    />
  );
}
