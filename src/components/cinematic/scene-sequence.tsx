'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ScenePlate } from './scene';

export interface SequenceScene {
  plate: ScenePlate;
  eyebrow: string;
  title: ReactNode;
  text: ReactNode;
  href: string;
  cta: string;
  caption?: string;
  /** Text side for this scene (alternates for an asymmetric rhythm). */
  side: 'left' | 'right';
}

function Photo({ plate, className, style }: { plate: ScenePlate; className?: string; style?: React.CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={plate.src} srcSet={plate.srcSet} sizes="100vw" alt={plate.alt} loading="lazy" decoding="async" draggable={false} className={cn('absolute inset-0 h-full w-full object-cover', className)} style={{ objectPosition: `${plate.focal.x * 100}% ${plate.focal.y * 100}%`, ...style }} />
  );
}

function Copy({ s, index, total, active }: { s: SequenceScene; index: number; total: number; active: boolean }) {
  return (
    <div className={cn('max-w-xl transition-[opacity,filter,transform] duration-[900ms] ease-[var(--ease-climb)]', active ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-4 opacity-0 blur-[10px]')} aria-hidden={!active}>
      <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk [text-shadow:0_1px_14px_rgb(14_20_24/0.7)]">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {s.eyebrow}
      </p>
      <h2 className="font-display text-[44px] leading-[0.98] [text-shadow:0_2px_30px_rgb(14_20_24/0.4)] md:text-[76px]">{s.title}</h2>
      <div className="mt-5 max-w-md text-[17px] leading-relaxed text-paper/85">{s.text}</div>
      <Link href={s.href} tabIndex={active ? 0 : -1} className="mt-8 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-magenta hover:text-paper">
        {s.cta} <span className="arrow" aria-hidden>→</span>
      </Link>
      {s.caption && <p className="mt-5 text-[11px] text-paper/45">{s.caption}</p>}
    </div>
  );
}

/**
 * An art-directed sequence: one pinned stage, photographs handing over with a clip wipe and a
 * slow settle, type resolving on alternating sides. Phones and reduced motion get the same
 * scenes stacked, with no pinning.
 */
export function SceneSequence({ scenes, label }: { scenes: SequenceScene[]; label: string }) {
  const root = useRef<HTMLElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const [mode, setMode] = useState<'pinned' | 'stacked'>('stacked');
  const [active, setActive] = useState(0);
  const n = scenes.length;

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pick = () => setMode(wide.matches && !reduce.matches ? 'pinned' : 'stacked');
    pick();
    wide.addEventListener('change', pick);
    reduce.addEventListener('change', pick);
    return () => {
      wide.removeEventListener('change', pick);
      reduce.removeEventListener('change', pick);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'pinned') return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
      // Scene i (i ≥ 1) wipes in around the boundary at i/n.
      layers.current.forEach((layer, i) => {
        if (!layer || i === 0) return;
        const t = Math.min(1, Math.max(0, (p - (i / n - 0.07)) / 0.14));
        const e = t * t * (3 - 2 * t);
        layer.style.clipPath = `inset(${(1 - e) * 100}% 0 0 0)`;
        const img = layer.firstElementChild as HTMLElement | null;
        if (img) img.style.transform = `scale(${1.08 - 0.08 * e}) translate3d(0, ${(1 - e) * 4}%, 0)`;
      });
      setActive(Math.min(n - 1, Math.floor(p * n + 0.07)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [mode, n]);

  if (mode === 'stacked') {
    return (
      <section aria-label={label}>
        {scenes.map((s, i) => (
          <div key={s.href} className="relative isolate flex min-h-[82svh] items-end overflow-hidden bg-night px-5 pb-14 pt-24 text-paper md:px-12">
            <Photo plate={s.plate} />
            <div aria-hidden className="scene-grade absolute inset-0" />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night/90 via-night/45 to-transparent" />
            <div className="relative mx-auto w-full max-w-[1320px]"><Copy s={s} index={i} total={n} active /></div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section ref={root} aria-label={label} className="relative" style={{ height: `${n * 100 + 20}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden bg-night text-paper">
        {scenes.map((s, i) => (
          <div key={s.href} ref={(el) => { layers.current[i] = el; }} className="absolute inset-0 will-change-[clip-path]" style={i === 0 ? undefined : { clipPath: 'inset(100% 0 0 0)' }}>
            <Photo plate={s.plate} className="will-change-transform" />
            <div aria-hidden className="scene-grade absolute inset-0" />
            <div aria-hidden className={cn('absolute inset-0', s.side === 'left' ? 'bg-linear-to-r from-night/70 via-night/20 to-transparent' : 'bg-linear-to-l from-night/70 via-night/20 to-transparent')} />
          </div>
        ))}
        <div className="relative mx-auto h-full max-w-[1320px] px-5 md:px-12">
          {scenes.map((s, i) => (
            <div key={s.href} className={cn('absolute bottom-16 md:bottom-20', s.side === 'left' ? 'left-5 md:left-12' : 'right-5 text-right md:right-12 [&_a]:ml-auto [&_div]:ml-auto')}>
              <Copy s={s} index={i} total={n} active={active === i} />
            </div>
          ))}
          <ol aria-hidden className="absolute right-5 top-24 hidden gap-2 md:right-12 lg:flex">
            {scenes.map((s, i) => (
              <li key={s.href} className={cn('h-px transition-[width,background-color] duration-700 ease-[var(--ease-climb)]', active === i ? 'w-12 bg-dusk' : 'w-5 bg-paper/40')} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
