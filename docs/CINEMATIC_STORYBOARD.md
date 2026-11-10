# ThePrivate: cinematic homepage storyboard

Revised 2026-11-10. **The film is built from photographs, not 3D models.** The earlier real-time Three.js cabin, jet and clouds were removed: visibly modelled aircraft are not acceptable for this brand. WebGL is not used on the homepage.

Reference category: jeskojets.com. We copy the kind of experience it offers (cabin, then window, then sky, then the aircraft climbing against the scroll), not its media, code or copy.

Implementation: `src/components/cinematic/flight-film.tsx` (choreography) and `src/components/cinematic/media.ts` (plates, focal geometry, credits, missing-asset slots). Plates are built by `scripts/media/build_film_assets.py`. Sources and licences are listed in `public/media/film/credits.json` and shown at `/legal/media-credits`.

## How the cabin-to-sky shot works with real photography

- The cabin photograph's window panes were blown out in the original exposure. The build script keys those panes to alpha with a soft luminance ramp, limited to pane shapes fitted by hand. The sunlit window reveals, bezels and bloom stay intact.
- A real sky photograph sits behind the cabin layer, so the actual window shows actual sky from the first frame.
- On scroll, the cabin plate scales exponentially around the forward pane's centre and translates that pane to the centre of the frame. The sky behind moves with a smaller parallax. When the pane's inscribed area covers the viewport, the cabin fades out, and a warm exposure bloom covers the pass through the glass.
- The geometry is computed from the cover-fit of the plate for the current viewport. It is recalculated on resize, so the window stays the target on any aspect ratio. On portrait screens, the plate element is the full cover-fit photograph, so pushing in never shows an edge.

## Act I: one pinned shot, 600 vh, scrubbed (GSAP ScrollTrigger, `scrub: 1.1`)

| # | Scroll | Plate(s) | Camera | Text |
|---|---|---|---|---|
| 1 | 0–4 % | Cabin (Embraer Lineage 1000, real photograph) with sky in the keyed window | Static. The window sits right of centre. | "Private aviation, *verified*." resolves from blur. CTA and "Skip the film". Photography credits link. |
| 2 | 2–32 % | Cabin over sky-horizon | Push toward the forward window, accelerating. The pane moves to the frame centre, and the sky shifts slightly behind it. | "Leave the terminal behind." (15–31 %) |
| 3 | 26–32 % | Sky-horizon | Pass through the glass. The exposure bloom peaks, then the cabin is gone. | — |
| 4 | 38–56 % | Sky-horizon, plus **aircraft plate J-1 (missing)** | Slow push over the cloud deck. The aircraft enters low in frame. | "Licensed operators. *Checked by us.*" |
| 5 | 55–72 % | Sky-horizon, plus **J-1 (missing)** | **Counter-scroll:** the aircraft climbs up the frame and pitches up as the page scrolls down. | "Up and away *from the ordinary.*" drifts down against the scroll. |
| 6 | 72–87 % | Sky-horizon, then sky-descent | Tilt down. The horizon plate slides up and away, and the cloud deck from above rises into place. | — |
| 7 | 87–100 % | Sky-descent, then the chart | The sectional chart dissolves in over the cloud deck, and a BOM→DXB great-circle arc draws itself. | "Where to?", then straight into the search |

While J-1 is missing, acts 4–5 play over the sky alone in production. In development, a labelled slot shows where the aircraft plate goes and moves with the counter-scroll, so the choreography can be reviewed. The slot is never shown in production and never filled with a substitute.

## Motion and performance

- One timeline drives a single progress value. A pure `apply(p)` writes transforms and opacity only, with no layout properties and no per-frame filters on the large plates. requestAnimationFrame held 61 fps in headless Chromium at 1440×810 and at 390×844 @2x on every captured frame. That is a smoke test, not a real-device GPU profile; check on a mid-range phone before launch.
- WebP plates in three sizes each (69 KB–911 KB). The cabin and horizon are `fetchpriority="high"`, and the descent plate is lazy.
- Reduced motion: no pin and no scrub. One still frame (cabin with sky in the window) and static text.

## Visual quality checklist (reviewed against the reference)

| Question | Status |
|---|---|
| Does the interior look like a real aircraft photograph? | Yes: it is one (Embraer Lineage 1000). |
| Do the seats and materials look authentic? | Yes: real leather, walnut veneer, tableware. |
| Are the clouds and sky photographic? | Yes: two real photographs at golden hour and sunset. |
| Does the cabin-to-sky transition feel convincing? | Yes: the real window pane opens onto real sky, and the camera pushes through it. |
| Does the aircraft look professionally filmed? | **Interim:** an AI-generated still supplied by ThePrivate, cut out and composited over S-1, and disclosed as AI-generated. It needs replacing with licensed air-to-air photography; see `docs/MEDIA_ASSET_PLAN.md`. |
| Are the images consistent? | Warm golden-hour grade across all three plates. J-1 must match it. |
