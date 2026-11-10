'use client';

import { useEffect, useRef } from 'react';
import { greatCirclePoints, type LatLon } from '@/lib/geo';
import { cn } from '@/lib/cn';

export interface MapPlace extends LatLon {
  code: string;
  city?: string | null;
}

/** Fraction of the canvas covered by interface (e.g. a planner); the route is framed in the rest. */
export interface Inset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

type View = { x: number; y: number; k: number }; // mercator centre (radians) and pixels per radian

// ---------------------------------------------------------------------------------------------
// Shared airport point set (public/media/map/airports.json, built from the airport table).
let pointsPromise: Promise<Float32Array> | null = null;
function loadPoints() {
  pointsPromise ??= fetch('/media/map/airports.json')
    .then((r) => r.json())
    .then((d: { p: number[] }) => {
      // [mercX, mercY, weight] per airport, pre-projected once.
      const out = new Float32Array(d.p.length);
      for (let i = 0; i < d.p.length; i += 3) {
        out[i] = rad(d.p[i]! / 100);
        out[i + 1] = mercY(d.p[i + 1]! / 100);
        out[i + 2] = d.p[i + 2]!;
      }
      return out;
    })
    .catch(() => new Float32Array());
  return pointsPromise;
}

const rad = (d: number) => (d * Math.PI) / 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + rad(Math.max(-84, Math.min(84, lat))) / 2));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const mix = (a: View, b: View, t: number): View => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t) });

/** Region shown before a route is chosen: India, the Gulf and the routes between them. */
const IDLE = { lon: 74, lat: 21, spanLon: 44 };

function fitView(w: number, h: number, inset: Inset, from?: MapPlace | null, to?: MapPlace | null): View {
  const left = (inset.left ?? 0) * w;
  const right = (inset.right ?? 0) * w;
  const top = (inset.top ?? 0) * h;
  const bottom = (inset.bottom ?? 0) * h;
  const aw = Math.max(120, w - left - right);
  const ah = Math.max(120, h - top - bottom);
  let minX: number, maxX: number, minY: number, maxY: number;
  if (from && to) {
    const pts = greatCirclePoints(from, to, 48).map((p) => [rad(p.lon), mercY(p.lat)] as const);
    minX = Math.min(...pts.map((p) => p[0]));
    maxX = Math.max(...pts.map((p) => p[0]));
    minY = Math.min(...pts.map((p) => p[1]));
    maxY = Math.max(...pts.map((p) => p[1]));
    // Never zoom closer than ~6° so neighbouring airports give geographic context.
    const minSpan = rad(6);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = Math.max(maxX - minX, minSpan);
    const sy = Math.max(maxY - minY, minSpan * 0.6);
    minX = cx - sx / 2; maxX = cx + sx / 2; minY = cy - sy / 2; maxY = cy + sy / 2;
  } else {
    const p = from ?? to;
    const lon = p?.lon ?? IDLE.lon;
    const lat = p?.lat ?? IDLE.lat;
    const span = rad(p ? 24 : IDLE.spanLon);
    minX = rad(lon) - span / 2; maxX = rad(lon) + span / 2;
    minY = maxY = mercY(lat);
  }
  const pad = 1.45;
  const k = Math.min(aw / ((maxX - minX) * pad || 1), ah / ((maxY - minY) * pad || 1), aw / rad(6));
  // Centre of the free area, expressed as a mercator centre for the whole canvas.
  const cx = (minX + maxX) / 2 - (left + aw / 2 - w / 2) / k;
  const cy = (minY + maxY) / 2 + (top + ah / 2 - h / 2) / k;
  return { x: cx, y: cy, k };
}

/**
 * The route map: every real airport as a point of light (Mercator), the great-circle route drawn
 * once with a travelling light, endpoints marked and named. Camera eases to each new route.
 */
export function RouteMap({ from, to, inset = {}, className, labels = true, label }: { from?: MapPlace | null; to?: MapPlace | null; inset?: Inset; className?: string; labels?: boolean; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ view: View | null; points: Float32Array | null; raf: number; size: [number, number] }>({ view: null, points: null, raf: 0, size: [0, 0] });
  const insetKey = JSON.stringify(inset);
  const routeKey = `${from?.lat},${from?.lon}|${to?.lat},${to?.lon}`;

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const s = state.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = getComputedStyle(document.documentElement);
    const mono = css.getPropertyValue('--font-plex-mono').trim() || 'monospace';
    const serif = css.getPropertyValue('--font-newsreader').trim() || 'serif';
    let disposed = false;

    const route = from && to ? greatCirclePoints(from, to, 96).map((p) => [rad(p.lon), mercY(p.lat)] as const) : null;

    function project(v: View, w: number, h: number, mx: number, my: number) {
      return [w / 2 + (mx - v.x) * v.k, h / 2 - (my - v.y) * v.k] as const;
    }

    function frame(v: View, drawT: number, markT: number) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const [w, h] = s.size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Graticule every 10°: a quiet geographic reference.
      ctx.strokeStyle = 'rgba(200,211,220,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 10) {
        const [x] = project(v, w, h, rad(lon), 0);
        if (x > -2 && x < w + 2) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      }
      for (let lat = -80; lat <= 80; lat += 10) {
        const [, y] = project(v, w, h, 0, mercY(lat));
        if (y > -2 && y < h + 2) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      }
      ctx.stroke();

      // Airports: round points, batched into one path per brightness level.
      const pts = s.points;
      if (pts) {
        const zoom = Math.min(1.5, Math.max(0.9, v.k / 650));
        const styles = ['rgba(200,211,220,0.36)', 'rgba(206,216,224,0.62)', 'rgba(240,226,204,0.9)'];
        const radii = [0.85, 1.15, 1.6];
        for (let level = 0; level < 3; level++) {
          const r = radii[level]! * zoom;
          ctx.fillStyle = styles[level]!;
          ctx.beginPath();
          for (let i = 0; i < pts.length; i += 3) {
            if (pts[i + 2] !== level) continue;
            const [x, y] = project(v, w, h, pts[i]!, pts[i + 1]!);
            if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      if (!route) return;
      const pr = route.map(([mx, my]) => project(v, w, h, mx, my));
      const n = Math.max(1, Math.floor((pr.length - 1) * drawT));
      // Route: dusk to magenta, with a soft glow.
      const g = ctx.createLinearGradient(pr[0]![0], pr[0]![1], pr.at(-1)![0], pr.at(-1)![1]);
      g.addColorStop(0, '#e2b07a');
      g.addColorStop(1, '#d4567f');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(226,176,122,0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pr[0]![0], pr[0]![1]);
      for (let i = 1; i <= n; i++) ctx.lineTo(pr[i]![0], pr[i]![1]);
      ctx.stroke();
      ctx.restore();

      // Travelling light at the head while drawing.
      if (drawT < 1) {
        const [hx, hy] = pr[n]!;
        const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
        halo.addColorStop(0, 'rgba(255,240,220,0.9)');
        halo.addColorStop(1, 'rgba(255,240,220,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
      }

      // Endpoints: ring + core, then names once the route has arrived.
      const ends: [readonly [number, number], MapPlace, number][] = [[pr[0]!, from!, 1], [pr.at(-1)!, to!, markT]];
      for (const [[x, y], place, a] of ends) {
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = 'rgba(243,240,232,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f3f0e8';
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
        if (labels) {
          const leftSide = x > w * 0.72;
          ctx.textAlign = leftSide ? 'right' : 'left';
          const tx = x + (leftSide ? -14 : 14);
          ctx.fillStyle = 'rgba(226,176,122,0.95)';
          ctx.font = `500 11px ${mono}`;
          ctx.fillText(place.code, tx, y - 6);
          if (place.city) {
            ctx.fillStyle = 'rgba(243,240,232,0.95)';
            ctx.font = `400 22px ${serif}`;
            ctx.fillText(place.city, tx, y + 16);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    function resize() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.size = [r.width, r.height];
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    }

    resize();
    const target = () => fitView(s.size[0], s.size[1], JSON.parse(insetKey) as Inset, from, to);
    const start = s.view ?? target();

    let t0 = 0;
    const CAM = reduce || !s.view ? 0 : 1100;
    const DRAW = reduce ? 0 : 1500;
    function tick(now: number) {
      if (disposed) return;
      if (!t0) t0 = now;
      const el = now - t0;
      const cam = CAM ? ease(Math.min(1, el / CAM)) : 1;
      const v = mix(start, target(), cam);
      s.view = v;
      const drawStart = CAM * 0.55;
      const dt = DRAW ? ease(Math.min(1, Math.max(0, (el - drawStart) / DRAW))) : 1;
      const mt = DRAW ? Math.min(1, Math.max(0, (el - drawStart - DRAW * 0.8) / 400)) : 1;
      frame(v, route ? dt : 0, mt);
      if (cam < 1 || (route && (dt < 1 || mt < 1))) s.raf = requestAnimationFrame(tick);
    }

    loadPoints().then((p) => {
      if (disposed) return;
      s.points = p;
      cancelAnimationFrame(s.raf);
      s.raf = requestAnimationFrame(tick);
    });

    // Only real size changes redraw (the observer also fires once on observe()).
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect();
      if (Math.abs(r.width - s.size[0]) < 1 && Math.abs(r.height - s.size[1]) < 1) return;
      cancelAnimationFrame(s.raf);
      resize();
      s.view = target();
      frame(s.view, route ? 1 : 0, 1);
    });
    ro.observe(cv);
    return () => {
      disposed = true;
      cancelAnimationFrame(s.raf);
      ro.disconnect();
    };
    // routeKey and insetKey capture from/to/inset by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, insetKey, labels]);

  const described = label ?? (from && to ? `Route from ${from.city ?? from.code} to ${to.city ?? to.code}` : 'Map of airports');
  return <canvas ref={canvas} role="img" aria-label={described} className={cn('block h-full w-full', className)} />;
}
