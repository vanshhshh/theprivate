import type { ReactNode } from 'react';
import { Plate, type PlateSpec } from './Plate';

/** The photographic band at the top of each tab: one plate, an eyebrow and an editorial title. */
export function ScreenHero({ plate, eyebrow, title, children }: { plate: PlateSpec; eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[38svh] flex-col justify-end overflow-hidden bg-night px-6 pb-8 text-paper" style={{ paddingTop: 'calc(var(--safe-top) + 56px)' }}>
      <Plate plate={plate} priority />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/55 to-night/20" />
      <div className="relative animate-rise">
        <p className="strip mb-3 text-[11px] uppercase tracking-[0.22em] text-dusk">{eyebrow}</p>
        <h1 className="font-display text-[40px] leading-[1.0]">{title}</h1>
        {children}
      </div>
    </section>
  );
}

/**
 * Honest placeholder used only while a tab is being built: it names what the screen will contain,
 * and never shows invented data.
 */
export function InBuild({ items }: { items: string[] }) {
  return (
    <section className="px-6 py-10">
      <p className="strip mb-5 inline-block rounded-full bg-paper-3 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-muted">Development build · being built</p>
      <ul className="divide-y divide-line border-y border-line">
        {items.map((i) => (
          <li key={i} className="py-4 text-[15px] text-ink-2">{i}</li>
        ))}
      </ul>
    </section>
  );
}
