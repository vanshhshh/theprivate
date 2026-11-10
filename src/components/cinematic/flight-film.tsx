'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { RouteMap } from '@/components/motion/route-map';
import { HeaderOver } from './header-over';
import { CABIN, JET, MISSING_JET_SPEC, SKY_DESCENT, SKY_HORIZON, type Plate } from './media';

const BOM = { lat: 19.0887, lon: 72.8679, code: 'BOM', city: 'Mumbai' };
const DXB = { lat: 25.2532, lon: 55.3657, code: 'DXB', city: 'Dubai' };
const SHOW_MISSING_SLOTS = process.env.NODE_ENV !== 'production';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

function Words({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="film-word inline-block whitespace-pre will-change-[filter,transform,opacity]">
          {w}{' '}
        </span>
      ))}
    </span>
  );
}

function PlateImg({ plate, className, priority, imgRef, sizes, style }: { plate: Plate; className?: string; priority?: boolean; imgRef?: React.Ref<HTMLImageElement>; sizes: string; style?: React.CSSProperties }) {
  return (
    // Pre-sized WebP plates with a hand-built srcset; they are transformed every frame, so the
    // optimiser's wrapper and lazy loading would only get in the way.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={plate.src}
      srcSet={plate.srcSet}
      sizes={sizes}
      alt={plate.alt}
      aria-hidden={plate.alt ? undefined : true}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      loading={priority ? 'eager' : 'lazy'}
      draggable={false}
      style={style}
      className={`absolute inset-0 h-full w-full object-cover will-change-transform ${className ?? ''}`}
    />
  );
}

/** Where the forward window pane lands on screen for an object-fit: cover plate. */
function geometry(vw: number, vh: number) {
  const a = CABIN.aspect;
  const [dw, dh] = vw / vh > a ? [vw, vw / a] : [vh * a, vh];
  const ox = (vw - dw) * CABIN.position.x;
  const oy = (vh - dh) * CABIN.position.y;
  const fx = ox + CABIN.focal.x * dw;
  const fy = oy + CABIN.focal.y * dh;
  const pw = CABIN.pane.w * dw;
  const ph = CABIN.pane.h * dh;
  // Scale at which the (rounded) pane's inscribed area covers the whole viewport.
  const K = Math.max(vw / (pw * 0.62), vh / (ph * 0.62));
  return { vw, vh, ox, oy, dw, dh, fx, fy, dx: vw / 2 - fx, dy: vh / 2 - fy, K };
}

/**
 * Act I. A pinned, scroll-scrubbed sequence built entirely from photography:
 * cabin photograph → push in on the window (sky photograph seen through the keyed pane) →
 * through the glass into open sky → aircraft act → camera tilts down onto the cloud deck →
 * the sky becomes ThePrivate's chart. One GSAP timeline drives image and type together.
 */
export function FlightFilm() {
  const root = useRef<HTMLElement>(null);
  const cabin = useRef<HTMLImageElement>(null);
  const horizon = useRef<HTMLImageElement>(null);
  const descent = useRef<HTMLImageElement>(null);
  const bloom = useRef<HTMLDivElement>(null);
  const jet = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  // The closing route map draws only when its act is reached.
  const [mapOn, setMapOn] = useState(false);
  const hasJetAct = Boolean(JET) || SHOW_MISSING_SLOTS;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setStill(true);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current!;
    let g = geometry(window.innerWidth, window.innerHeight);
    const state = { p: 0 };

    const apply = () => {
      const p = state.p;
      const { fx, fy, dx, dy, K, vh } = g;
      const origin = `${fx}px ${fy}px`;

      // 1–3: push in on the forward window until the pane passes the lens.
      const c = phase(p, 0.02, 0.32);
      const e = smooth(c);
      const k = Math.exp(Math.log(K) * Math.pow(c, 1.7));
      if (cabin.current) {
        const s = cabin.current.style;
        // The element is the whole cover-fit photograph (not clipped to the viewport), so the
        // push-in never reveals an edge, even when the window sits near a portrait screen's side.
        s.inset = 'auto';
        s.maxWidth = 'none'; // preflight caps <img> at 100% of the viewport-wide parent
        s.left = `${g.ox}px`;
        s.top = `${g.oy}px`;
        s.width = `${g.dw}px`;
        s.height = `${g.dh}px`;
        s.transformOrigin = `${CABIN.focal.x * g.dw}px ${CABIN.focal.y * g.dh}px`;
        s.transform = `translate3d(${dx * e}px, ${dy * e}px, 0) scale(${k})`;
        s.opacity = String(1 - phase(c, 0.82, 1));
        s.visibility = c >= 1 ? 'hidden' : 'visible';
      }
      // Exposure lift as the glass fills the frame, like a lens adapting to daylight.
      if (bloom.current) bloom.current.style.opacity = String(Math.max(0, 1 - Math.abs(c - 0.8) / 0.22) * 0.6);

      // Sky: parallax behind the window, slow push once outside, then the camera tilts down.
      const drift = phase(p, 0.32, 0.74);
      const tilt = smooth(phase(p, 0.72, 0.87));
      if (horizon.current) {
        const s = horizon.current.style;
        s.transformOrigin = origin;
        // Scale always exceeds 1 + 2·|translate|/size, so the plate never uncovers the frame.
        s.transform = `translate3d(${dx * e * 0.08}px, ${dy * e * 0.12 - tilt * vh * 0.3}px, 0) scale(${1.2 - 0.06 * e + 0.08 * drift})`;
        s.opacity = String(1 - tilt);
      }
      if (descent.current) {
        const s = descent.current.style;
        s.transform = `translate3d(0, ${(1 - tilt) * vh * 0.18}px, 0) scale(${1.42 - 0.3 * tilt - 0.05 * phase(p, 0.87, 1)})`;
        s.opacity = String(tilt);
      }

      // 4–5: aircraft act. Counter-scroll: as the page goes down, the aircraft climbs up the frame.
      if (jet.current) {
        // Two beats: it drifts in low beneath "Licensed partners", then climbs out through the frame
        // against the scroll during "Up and away". It faces left: travels left, pitches nose-up (+deg).
        const cruise = smooth(phase(p, 0.34, 0.52));
        const climb = smooth(phase(p, 0.54, 0.72));
        const s = jet.current.style;
        const x = 0.1 - 0.07 * cruise - 0.14 * climb;
        const y = 0.66 - 0.14 * cruise - 0.98 * climb;
        s.transform = `translate3d(${x * g.vw}px, ${y * vh}px, 0) rotate(${1 + 8 * climb}deg) scale(${0.92 + 0.08 * cruise})`;
        s.opacity = String(Math.min(phase(p, 0.34, 0.39), 1 - phase(p, 0.7, 0.72)));
      }
      // The film ends on the night map, so the header floats over the whole film.
      document.documentElement.dataset.film = 'on';
      if (p > 0.86) setMapOn(true);
    };

    const ctx = gsap.context(() => {
      gsap.fromTo('.film-title .film-word', { opacity: 0, filter: 'blur(16px)', y: 18 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.6, ease: 'expo.out', stagger: 0.09, delay: 0.25 });
      gsap.fromTo('.film-intro-fade', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 1.1, stagger: 0.12 });

      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 1.1 } });
      tl.to(state, { p: 1, duration: 1, onUpdate: apply }, 0);
      const blurOut = { opacity: 0, filter: 'blur(12px)', y: -24, ease: 'power2.in' };
      const blurIn = { opacity: 0, filter: 'blur(14px)', y: 16 };
      const clear = { opacity: 1, filter: 'blur(0px)', y: 0, ease: 'expo.out' };
      tl.to('.film-act-1', { ...blurOut, duration: 0.05 }, 0.04);
      tl.fromTo('.film-act-2 .film-word', blurIn, { ...clear, duration: 0.04, stagger: 0.008 }, 0.15);
      tl.to('.film-act-2', { ...blurOut, duration: 0.04 }, 0.27);
      tl.fromTo('.film-act-4 .film-word', blurIn, { ...clear, duration: 0.04, stagger: 0.008 }, 0.4);
      if (JET) tl.fromTo('.film-act-4 .film-caption', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.44);
      tl.to('.film-act-4', { ...blurOut, duration: 0.04 }, 0.52);
      // Counter-scroll line: drifts DOWN the screen while the page moves up and the aircraft climbs.
      tl.fromTo('.film-act-5', { opacity: 0, filter: 'blur(14px)', yPercent: -60 }, { opacity: 1, filter: 'blur(0px)', yPercent: 0, duration: 0.05, ease: 'expo.out' }, 0.55);
      tl.to('.film-act-5', { yPercent: 140, duration: 0.11 }, 0.6);
      tl.to('.film-act-5', { opacity: 0, filter: 'blur(10px)', duration: 0.03 }, 0.69);
      tl.fromTo('.film-chart', { opacity: 0 }, { opacity: 1, duration: 0.08, ease: 'power1.inOut' }, 0.88);
      tl.fromTo('.film-act-6 .film-word', blurIn, { ...clear, duration: 0.03, stagger: 0.006 }, 0.93);
      tl.fromTo('.film-cue', { opacity: 1 }, { opacity: 0, duration: 0.03 }, 0.02);
    }, el);

    const onResize = () => {
      g = geometry(window.innerWidth, window.innerHeight);
      apply();
    };
    window.addEventListener('resize', onResize);
    apply();

    return () => {
      window.removeEventListener('resize', onResize);
      ctx.revert();
      delete document.documentElement.dataset.film;
    };
  }, []);

  // Cover-fit plates are wider than the viewport on portrait screens; ask for enough pixels.
  const coverSizes = '(max-aspect-ratio: 3/2) 150vh, 100vw';
  return (
    <section ref={root} aria-label="ThePrivate: a flight" className="relative -mt-16 bg-night" style={{ height: still ? '100svh' : '600svh' }}>
      {still && <HeaderOver />}
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <PlateImg plate={SKY_DESCENT} imgRef={descent} sizes={coverSizes} className="opacity-0" />
        <PlateImg plate={SKY_HORIZON} imgRef={horizon} sizes={coverSizes} priority />
        <PlateImg
          plate={CABIN}
          imgRef={cabin}
          sizes={coverSizes}
          priority
          // Same framing as geometry(), so the first paint (before JS) does not jump.
          style={{ objectPosition: `${CABIN.position.x * 100}% ${CABIN.position.y * 100}%` }}
          className="backface-hidden"
        />
        <div
          ref={bloom}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen bg-[radial-gradient(70%_70%_at_50%_50%,rgba(255,236,206,0.95)_0%,rgba(255,226,190,0.5)_45%,rgba(255,220,180,0)_80%)]"
        />
        {/* Cinematic grade shared by every plate: gentle vignette, never a flat overlay. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(14,20,24,0)_55%,rgba(14,20,24,0.45)_100%)]" />

        {!still && hasJetAct && (
          <div ref={jet} className="pointer-events-none absolute left-[12%] top-0 w-[76%] opacity-0 will-change-transform md:left-[20%] md:w-[60%]">
            {JET ? (
              <PlateImg plate={JET} sizes="(min-width: 768px) 60vw, 76vw" className="relative! h-auto! object-contain!" />
            ) : (
              <div role="note" className="aspect-[16/7] border-2 border-dashed border-magenta/80 bg-night/30 p-4 text-paper backdrop-blur-[2px]">
                <p className="strip text-[11px] uppercase tracking-[0.2em] text-magenta">Missing asset · development only</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/90">{MISSING_JET_SPEC}</p>
                <p className="mt-2 text-xs text-paper/60">Set <code>JET</code> in src/components/cinematic/media.ts. See docs/MEDIA_ASSET_PLAN.md.</p>
              </div>
            )}
          </div>
        )}

        <div className="film-act-1 absolute inset-0 flex items-end px-5 pb-16 md:px-12 md:pb-20">
          {/* Legibility vignette belongs to the title and leaves with it. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_75%_at_15%_95%,rgba(14,20,24,0.78)_0%,rgba(14,20,24,0)_62%)]" />
          <div className="relative mx-auto w-full max-w-[1240px] text-paper">
            <p className="film-intro-fade strip mb-5 text-xs uppercase tracking-[0.2em] text-paper/80">ThePrivate · private aviation marketplace</p>
            <h1 className="film-title font-display max-w-4xl text-[48px] leading-[0.98] [text-shadow:0_2px_24px_rgba(14,20,24,0.35)] md:text-[96px]">
              <Words text="Private aviation," />
              <br />
              <Words text="verified." className="italic" />
            </h1>
            <p className="film-intro-fade mt-6 max-w-xl text-[17px] leading-relaxed text-paper/90">Checked flight partners. Clear prices. Nothing booked until you choose.</p>
            <div className="film-intro-fade mt-8 flex flex-wrap items-center gap-6">
              <a href="#plan" className="bg-paper px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-magenta hover:text-paper">Plan a flight</a>
              <a href="#plan" className="text-sm text-paper/85 underline decoration-paper/40 underline-offset-4 hover:text-paper">Skip the film</a>
            </div>
          </div>
          <Link href="/legal/media-credits" className="film-intro-fade strip absolute bottom-6 left-5 text-[10px] uppercase tracking-[0.18em] text-paper/55 hover:text-paper md:left-12">
            Photography credits
          </Link>
        </div>

        {!still && (
          <>
            <p className="film-cue strip pointer-events-none absolute bottom-6 right-6 text-[11px] uppercase tracking-[0.2em] text-paper/75 md:right-12">Scroll to fly ↓</p>
            <h2 className="film-act-2 [&_.film-word]:opacity-0 pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-display text-[40px] leading-tight text-paper [text-shadow:0_2px_30px_rgba(14,20,24,0.35)] md:text-[72px]">
              <Words text="Leave the terminal behind." />
            </h2>
            <div className="film-act-4 [&_.film-word]:opacity-0 [&_.film-caption]:opacity-0 pointer-events-none absolute inset-x-0 top-[16vh] px-5 md:px-12">
              <div className="mx-auto max-w-[1240px]">
                <h2 className="font-display max-w-3xl text-[40px] leading-[1.02] text-paper [text-shadow:0_2px_30px_rgba(14,20,24,0.4)] md:text-[76px]">
                  <Words text="Licensed partners." />
                  <br />
                  <Words text="Checked by us." className="italic" />
                </h2>
                {JET && <p className="film-caption strip mt-6 text-[11px] uppercase tracking-[0.2em] text-paper/75">Illustrative aircraft{JET.generated ? ' · AI-generated image' : ''} · not a listing</p>}
              </div>
            </div>
            <h2 className="film-act-5 pointer-events-none absolute inset-x-0 top-[22vh] text-center font-display text-[40px] leading-tight text-paper opacity-0 [text-shadow:0_2px_30px_rgba(14,20,24,0.4)] md:text-[80px]">
              Up and away <em>from the ordinary.</em>
            </h2>
            <div className="film-chart pointer-events-none absolute inset-0 bg-night opacity-0">
              <div className="absolute inset-0" aria-hidden>
                <RouteMap from={mapOn ? BOM : null} to={mapOn ? DXB : null} inset={{ top: 0.36, bottom: 0.06 }} />
              </div>
              <h2 className="film-act-6 [&_.film-word]:opacity-0 absolute inset-x-0 top-[14vh] text-center font-display text-[56px] text-paper md:text-[104px]">
                <Words text="Where to?" />
              </h2>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
