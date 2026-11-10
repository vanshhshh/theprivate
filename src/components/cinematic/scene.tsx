import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { HeaderOver } from './header-over';
import { SKY_DESCENT, SKY_HORIZON } from './media';
import scenes from './scenes.json';

export interface ScenePlate {
  src: string;
  srcSet: string;
  aspect: number;
  focal: { x: number; y: number };
  alt: string;
}

export type SceneKey = keyof typeof scenes | 'sky-horizon' | 'sky-descent';

/** Every photograph a route can open on: the graded scene plates plus the film's own skies. */
export function scene(key: SceneKey): ScenePlate {
  if (key === 'sky-horizon') return { ...SKY_HORIZON, focal: { x: 0.5, y: 0.55 }, alt: 'Above the clouds at golden hour.' };
  if (key === 'sky-descent') return { ...SKY_DESCENT, focal: { x: 0.5, y: 0.5 }, alt: 'A sunset cloud deck seen from above.' };
  return scenes[key];
}

/** The film's type treatment: each word resolves out of blur, staggered. CSS only. */
export function Resolve({ text, className, offset = 0 }: { text: string; className?: string; offset?: number }) {
  return (
    <span className={cn('resolve', className)}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="w" style={{ ['--i' as string]: i + offset }}>
          {w}{' '}
        </span>
      ))}
    </span>
  );
}

/** A full-bleed graded photograph. `drift` adds scroll parallax; `settle` the one-time camera settle. */
export function SceneImage({ plate, sizes = '100vw', priority, className, drift = true, settle = true }: { plate: ScenePlate; sizes?: string; priority?: boolean; className?: string; drift?: boolean; settle?: boolean }) {
  return (
    <div aria-hidden={plate.alt ? undefined : true} className={cn('absolute inset-0 overflow-hidden', drift && 'scene-photo-drift', className)}>
      {/* Pre-graded responsive WebP plates; next/image's optimiser adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plate.src}
        srcSet={plate.srcSet}
        sizes={sizes}
        alt={plate.alt}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        draggable={false}
        className={cn('h-full w-full object-cover', settle && 'scene-settle')}
        style={{ objectPosition: `${plate.focal.x * 100}% ${plate.focal.y * 100}%` }}
      />
    </div>
  );
}

const HEIGHTS = {
  full: 'min-h-[100svh]',
  tall: 'min-h-[86svh] md:min-h-[80svh]',
  band: 'min-h-[52svh] md:min-h-[46svh]',
} as const;

/**
 * The photographic opening of a route: one photograph, one idea. The header floats over it.
 * `title` strings resolve word by word; `titleItalic` adds the film's italic second line.
 */
export function SceneHero({
  scene: key,
  eyebrow,
  title,
  titleItalic,
  lede,
  size = 'tall',
  children,
  aside,
  className,
  titleAs: H = 'h1',
}: {
  scene: SceneKey;
  eyebrow?: ReactNode;
  title: string;
  titleItalic?: string;
  lede?: ReactNode;
  size?: keyof typeof HEIGHTS;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
  titleAs?: 'h1' | 'h2';
}) {
  const plate = scene(key);
  const words = title.split(' ').length;
  return (
    <section className={cn('relative isolate -mt-16 flex flex-col overflow-hidden bg-night text-paper', HEIGHTS[size], className)}>
      <HeaderOver />
      <SceneImage plate={plate} priority />
      <div aria-hidden className="scene-grade absolute inset-0" />
      <div className="scene-type-drift relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-end px-5 pb-12 pt-28 md:px-12 md:pb-16">
        <div className={cn('grid items-end gap-10', Boolean(aside) && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]')}>
          <div className="max-w-4xl">
            {eyebrow && <p className="resolve-late strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk [text-shadow:0_1px_14px_rgb(14_20_24/0.75)]">{eyebrow}</p>}
            <H className="font-display text-[44px] leading-[0.98] [text-shadow:0_2px_30px_rgb(14_20_24/0.35)] sm:text-[60px] md:text-[88px]">
              <Resolve text={title} />
              {titleItalic && (
                <>
                  <br />
                  <Resolve text={titleItalic} className="italic" offset={words} />
                </>
              )}
            </H>
            {lede && <div className="resolve-late mt-6 max-w-xl text-[17px] leading-relaxed text-paper/85">{lede}</div>}
            {children && <div className="resolve-late mt-8">{children}</div>}
          </div>
          {aside && <div className="resolve-late">{aside}</div>}
        </div>
      </div>
    </section>
  );
}

/** A chapter opener on chart paper: eyebrow, one statement, optional aside. */
export function Chapter({ eyebrow, title, aside, className, as: H = 'h2' }: { eyebrow?: ReactNode; title: ReactNode; aside?: ReactNode; className?: string; as?: 'h1' | 'h2' }) {
  return (
    <div className={cn('reveal mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end', className)}>
      <div className="max-w-3xl">
        {eyebrow && <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-magenta">{eyebrow}</p>}
        <H className="font-display text-[36px] leading-[1.02] md:text-[56px]">{title}</H>
      </div>
      {aside && <div className="text-[15px] text-ink-2 md:max-w-sm md:text-right">{aside}</div>}
    </div>
  );
}

/**
 * A cinematic empty state: when there is nothing to show, the page still has a scene. A real
 * photograph, one honest sentence and one clear alternative. Never fabricated content.
 */
export function SceneEmpty({ scene: key, eyebrow, title, children, action, className }: { scene: SceneKey; eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('reveal relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden rounded-sm bg-night text-paper md:min-h-[540px]', className)}>
      <SceneImage plate={scene(key)} sizes="(min-width:1320px) 1240px, 100vw" drift={false} settle={false} />
      <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night/90 via-night/55 to-night/10" />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night/70 to-transparent" />
      <div className="relative max-w-2xl p-8 md:p-14">
        {eyebrow && <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">{eyebrow}</p>}
        <h3 className="font-display text-[40px] leading-[1.02] md:text-[60px]">{title}</h3>
        {children && <div className="mt-5 max-w-lg text-[17px] leading-relaxed text-paper/80">{children}</div>}
        {action && <div className="mt-9 flex flex-wrap gap-4">{action}</div>}
      </div>
    </div>
  );
}
