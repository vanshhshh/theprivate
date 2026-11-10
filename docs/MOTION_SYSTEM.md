# Motion system

The opening film is the reference. Its vocabulary:
- slow camera moves eased like an aircraft;
- type that resolves out of blur like cloud clearing;
- layers moving at different speeds (parallax);
- cuts that dissolve rather than slide.

The rest of the site uses the same vocabulary, quieter.

## Curves and durations

| Token | Value | Use |
|---|---|---|
| `--ease-climb` | `cubic-bezier(0.22, 1, 0.36, 1)` | Everything that arrives: reveals, entrances, hover lift |
| `--ease-approach` | `cubic-bezier(0.65, 0, 0.35, 1)` | Things that travel: header colour, menu panels |
| `--dur-1` / `2` / `3` / `4` | 120 / 220 / 420 / 800 ms | Micro / control / component / scene |
| `--dur-scene` | 1200 ms | Scene photo settle and the title resolve |

Nothing a user waits on lasts longer than 420 ms. Scene-level motion (1.2 s) is decorative, and content is usable from the first frame.

## The patterns

1. **Scene cut (route transitions).** React `<ViewTransition>` in each group's `template.tsx`. The old page dissolves with 4 px defocus and a 0.99 scale over 260 ms. The new page resolves from 6 px defocus and a 1.01 scale over 520 ms, starting at 120 ms. The header has its own `view-transition-name` and never animates: it is the fixed anchor. Account pages use the same cut, and consoles use a 160 ms crossfade only.
2. **Navigation feedback.** `useLinkStatus` draws a dusk hairline under the pending header link at once, so a dynamic route never feels unresponsive.
3. **Scene settle.** The hero photograph eases from scale 1.06 to 1 over 1.6 s on load (CSS). Its title words resolve from `blur(14px)` and 16 px down, staggered 70 ms, which is the film's text treatment.
4. **Scene parallax.** CSS scroll-driven: the photo drifts at about 30 % of scroll speed and the title at about 60 %, while it is in view. It is compositor-only, with no JavaScript.
5. **Reveal.** Content on paper rises 18 px and fades in as it enters the viewport (CSS `view()` timeline), with a capped stagger.
6. **Image reveal.** Listing and editorial images uncover with a clip-path inset from the bottom (scroll-driven) and settle 1.04 → 1.
7. **Micro-interactions.**
   - Primary buttons: the arrow advances 3 px on hover.
   - Links: the underline draws from the left.
   - List rows: the journey hairline extends.
   - Images: 1.03 zoom on hover over 800 ms.
8. **Route camera and draw** (`RouteMap`, canvas).
   - When a route changes, the camera eases (cubic in-out, 1.1 s) from the current view to frame the new route.
   - At 55 % of the camera move, the great circle draws (1.5 s) with a travelling light at its head.
   - Endpoint labels resolve as it arrives.
   - It renders only while moving. In the film, the map starts only when its act is reached.
   - Reduced motion: drawn instantly.
9. **Departure-board digits.** FlapText for prices that change (offers) and the planner's distance readout.

## Rules

- No looping or floating animation, no bouncing, and no scroll locking or scroll-jacking. The film's pin is the single exception, and it can be skipped ("Skip the film").
- Animate only `transform`, `opacity`, `filter` (on small elements) and `clip-path`.
- **Reduced motion:**
  - All of the above collapse to instant states, and view transitions take 0 s.
  - Scenes render settled, and the film becomes a single still.
  - Every action is reachable without motion.
- **Mobile:** parallax amplitude is halved, there are no blur transitions on large layers, and images are served at viewport-appropriate sizes.
- JavaScript animation (GSAP) exists only in the film. Every other effect is CSS, which keeps the public pages light.
