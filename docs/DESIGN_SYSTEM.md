# Design system: "From the sky to the chart"

The opening film already holds the concept. It begins in a photographed cabin, flies out into the sky, and ends when the sky resolves into ThePrivate's chart paper, ready for "Where to?". **Every page repeats that move.**

- A **Scene** is a full-bleed photograph in the film's grade, with editorial type and the header floating over it. It is where the page sets a mood and states one idea.
- The scene settles into the **Chart**: warm paper where the customer reads, compares and acts. Information never sits on a photograph unless it is on glass.

Customers always know where they are. Imagery means "this is the experience" and paper means "this is the information".

## Colour (derived from the film)

| Token | Value | Origin in the film | Use |
|---|---|---|---|
| `night` | `#0e1418` | Cabin shadows; film background | Scene base, footer, console rail |
| `night-2` | `#172128` | | Raised dark surfaces |
| `paper` | `#f3f0e8` | The chart the film ends on | The Chart surface |
| `paper-2` / `paper-3` | `#ebe7dc` / `#e1dccf` | | Quiet fills, hover |
| `ink` / `ink-2` / `muted` | `#111518` / `#2b3137` / `#646a71` | | Text |
| `dusk` | `#e2b07a` | Horizon glow in the sky plate | Sparse highlight on dark (eyebrows, hairlines, focus on glass) |
| `haze` | `#c8d3dc` | Upper sky | Secondary text on dark |
| `magenta` | `#a3245c` | The route arc | **The single action colour.** Primary buttons, the active state and the route line. Never decoration. |
| Status: `verified` / `indicative` / `unconfirmed` / `danger` | unchanged | | Meaning only; text always carries it |

The grade for every photograph: shadows drift toward `night`, highlights toward warm paper light, with gentle contrast. It is applied in `scripts/media/build_scene_assets.py`, and a CSS overlay (`.scene-grade`) secures legibility.

## Surfaces

See `DESIGN_DIRECTION.md` for the three surfaces (Scene, Night map, Chart) and when each is used.

- **Night map:** the `RouteMap` canvas over `night` (or over a darkened sky plate on `/charter`).
  - Airport points come in three weights: scheduled-service airports are brightest, other airports with an IATA code are medium, and the rest are faint.
  - A 10° graticule at 6 % opacity.
  - The route is a dusk-to-magenta gradient with a soft glow, with paper rings at the endpoints.
  - Labels use Plex Mono codes in dusk and Newsreader city names in paper.

- **Scene:** a photograph, a bottom-weighted night gradient for type, and a vignette. The header is transparent with paper type.
- **Chart:** `paper`, with the optional `chart-graticule` texture used sparingly (the planner and empty states).
- **Glass** (`.glass`, `.glass-dark`): translucent paper or night with a 24 px backdrop blur, a hairline border and soft depth. Used **only** where a working surface floats over a photograph: the flight planner, the scrolled header, the mobile menu, and the booking panel on detail pages. Nowhere else.
- **Rules:** hairlines (`line`) separate information. Cards are avoided; lists are typographic. Thick `ink` rules mark section starts.

## Typography

- **Display: Newsreader.** Light to regular weight, tight leading (0.95–1.05), negative tracking.
  - Italic carries emphasis, as the film does ("*verified.*").
  - Scales: `display-xl` clamp(48→120 px) for scene titles; `display-l` clamp(36→72 px) for section statements; 28–32 px for item names.
- **UI: Instrument Sans.** 15–17 px for body. Labels are sentence-case, 13 px and medium weight, never shouted.
- **Data: IBM Plex Mono**, only for airport codes, times, references and prices in comparisons. It is never used for prose.
- **Eyebrows:** mono, 11 px, tracked 0.2em, `dusk` on dark and `magenta` on paper. At most one per section.
- **Copy:** one idea per scene, short sentences and second person. Explanations appear on demand (a `details` element or hint text), not as paragraphs.

## Components (shared)

| Component | Role |
|---|---|
| `SceneHero` | The photographic opening of each route. Sizes: `full` (100svh), `tall` (78svh) and `band` (46svh). Title words resolve from blur, the photo settles from a 1.06 scale, and scroll parallax is CSS-only. |
| `Chapter` | A section opener on paper: eyebrow, a display statement and an optional aside. Replaces `PageHeader` on public pages. |
| `PageHeader` | Kept for the account and consoles (denser), restyled. |
| Buttons | `primary` (magenta), `secondary` (ink outline), `light` (paper on dark), `glass`, `ghost` and `quiet`. Arrow micro-motion on primary/light. |
| Forms | Underlined fields, sentence-case labels, 17 px values, generous rhythm. Errors stay inline. Unchanged APIs. |
| `FlightPlanner` | `CharterSearch`. Variant `stage`: a glass planner floating over the full-bleed live route map, with the camera framing the chosen route in the free part of the screen. Variant `glass`: the planner alone, as in "Change journey". Same fields, names and behaviour. |
| `RouteMap` | The night map (`components/motion/route-map.tsx`). Uses a shared static point set built from the airport table (`scripts/media/build_airport_map.ts`), Mercator projection, an `inset` for the space taken by the interface, an eased camera and a single route draw. |
| `SceneEmpty` | A cinematic empty state: a graded photograph, one honest sentence and one alternative action. It replaces the beige empty panels on public and customer pages. Internal screens keep the light `EmptyState`. |
| `Journey` | Codes in mono, city names in display, and a drawn hairline arc between them. Used for results, offers, trips and one-way offers. |
| Status | `audience="customer"` maps internal states to plain language. Internal screens keep precise labels. |

## Layout

- Max content width is 1240 px (1320 px for editorial grids). The gutter is 20 px on mobile and 32–48 px on desktop.
- Asymmetry is preferred: image left and text right, or a 7/5 split. Grids use 1, 2 or 3 columns with varied rhythm, not uniform tiles.
- Mobile is composed deliberately: scenes are 72–88svh tall, the planner stacks into a single column of prompts, and sticky action bars carry the primary action on detail pages.

## Public vs customer vs internal

| | Public | Customer account | Operator / admin |
|---|---|---|---|
| Opening | Full scenes | A dusk band and personal greeting | None. Night rail |
| Density | Low | Medium | High: tables and filters |
| Language | Customer | Customer | Operational (precise) |
| Motion | Full system | Calm (fades and reveals) | Minimal (≤ 180 ms fades) |
