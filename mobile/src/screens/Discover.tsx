import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { Plate, PLATES } from '@/components/Plate';

const HOW = [
  ['Tell us the journey', 'Route, date and passengers. That is all we need to begin.'],
  ['Compare real offers', 'Licensed flight partners reply with priced offers you can compare.'],
  ['Fly with confidence', 'Your partner operates the flight; ThePrivate keeps every detail in one place.'],
] as const;

/** Discover: the cinematic front door. Live rails (one-way offers, aircraft) arrive in Phase 5. */
export function Discover() {
  return (
    <div className="bg-night text-paper">
      <section className="relative isolate flex min-h-[86svh] flex-col justify-end overflow-hidden px-6" style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 40 }}>
        <Plate plate={PLATES.cabinWindow} priority className="animate-[drift_14s_var(--ease-approach)_both]" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/40 to-night/10" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-night/70 to-transparent" />

        <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6" style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}>
          <p className="font-display text-[22px] leading-none">
            <span className="italic">The</span>Private<span className="ml-0.5 align-super text-[10px] text-magenta">●</span>
          </p>
          <button type="button" aria-label="Notifications" className="grid size-11 place-items-center rounded-full bg-white/8 backdrop-blur-md">
            <Icon name="bell" className="size-5" />
          </button>
        </header>

        <div className="relative animate-rise">
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Private aviation</p>
          <h1 className="font-display text-[56px] leading-[0.95] tracking-[-0.01em]">
            Where <em>to?</em>
          </h1>
          <p className="mt-4 max-w-[30ch] text-[16px] leading-relaxed text-paper/75">Private flights arranged with licensed flight partners, from one request.</p>
          <Link to="/plan" className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-paper px-7 text-[15px] font-medium text-ink active:scale-[0.98]">
            Plan a flight <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </section>

      <section className="bg-paper px-6 pb-14 pt-12 text-ink">
        <p className="strip mb-6 text-[11px] uppercase tracking-[0.22em] text-muted">How it works</p>
        <ol className="space-y-7">
          {HOW.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[28px_1fr] gap-x-3">
              <span className="strip pt-1 text-[12px] text-magenta">0{i + 1}</span>
              <div>
                <h2 className="font-display text-[24px] leading-tight">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 border-t border-line pt-5 text-[12.5px] leading-relaxed text-muted">ThePrivate arranges private flights. Every flight is operated by an independent, licensed air operator.</p>
      </section>
    </div>
  );
}
