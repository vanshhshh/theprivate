# ThePrivate mobile: design system

Phase 3 deliverable. It carries the opening film's language (night skies, dusk light, editorial serif, real photography) onto a phone. The app shares the website's tokens rather than inventing a second brand.

## 1. Tokens (shared with the website)
- **Source:** `mobile/src/styles/app.css` mirrors the website's `@theme`, and `mobile/tests/tokens.test.ts` fails if any colour drifts.
- **Native colours:** these are defined in `android/.../values/colors.xml` (`tp_night`, `tp_paper`, `tp_magenta`).

| Role | Token | Use |
|---|---|---|
| Night surfaces | `night` #0e1418, `night-2`, `night-line` | Heroes, tab bar, sheets over photography |
| Paper surfaces | `paper` #f3f0e8, `paper-2`, `paper-3` | Reading surfaces: lists, forms, detail |
| Ink | `ink`, `ink-2`, `muted`, `line` | Text and rules on paper |
| Accent | `magenta` #a3245c | **One** primary action per screen; the unread dot; the brand dot |
| Film light | `dusk` #e2b07a, `haze` | Eyebrows and active-tab marks on night only (sparingly) |
| Truth states | `verified`, `indicative`, `unconfirmed`, `danger` (+ `-bg`) | Status chips. They are never decorative. |

## 2. Typography

| Style | Font | Size / leading | Use |
|---|---|---|---|
| Display XL | Newsreader 400, italic accents | 56/0.95 | The Discover hero only |
| Display L | Newsreader | 40/1.0 | Tab heroes |
| Display M | Newsreader | 24–28/1.15 | Section and card titles |
| Body | Instrument Sans | 15–16/1.55 | Paragraphs, list text |
| UI | Instrument Sans 500 | 13–15 | Buttons, inputs, tabs (10.5) |
| Data strip | IBM Plex Mono | 11–12, +0.04em, uppercase eyebrows | Codes (BOM, VABB), references (TP-…), prices, times |

- **Fonts are bundled** (no network fonts).
- **Readability:** body text is never below 15 px, and data never below 11 px.
- **Dynamic type:** sizes are in px for layout stability. Phase 7 adds an accessibility scale (it respects the OS text size up to 130 %).

## 3. Layout
- **Edge to edge** behind the system bars. `--safe-top` and `--safe-bottom` come from Capacitor's insets on Android and `env()` on iOS.
- **Gutters:** a 24 px horizontal gutter, and a 64 px tab bar plus the safe area.
- **Screen anatomy:**
  - a **photographic hero band** (38–86 svh) on night;
  - then a **paper reading surface**;
  - actions sit within thumb reach, in the bottom 40 %.
- **No generic white cards.** Lists use hairline rules (`line`) on paper. Cards exist only where content is an object, such as a flight, an offer or an aircraft, and those cards carry their photo.

## 4. Imagery
- **Real photography only:** the licensed plates are synced from the website (`npm run assets:sync`), and their credits live with the website's media credits.
- **Scrims:** heroes always sit under a `night` gradient (`from-night via-night/40`) so text clears WCAG AA on any photo.
- **Captions:** an aircraft photo that is not the offered aircraft says **"Illustrative"**. Partner-supplied approved photos are shown as the actual aircraft.
- **Delivery:** images are delivered at 960 and 1600 widths, with `srcset` and lazy loading below the fold. There are no visible 3D models and no stock clichés.
- **Video:** the hero film is replaced on phones by a **still with a 14 s slow drift** (`scale 1.08 → 1`). Video, if introduced, must have a still fallback, autoplay muted only on Wi-Fi, and pause off-screen.

## 5. Motion
| Name | Curve | Duration | Use |
|---|---|---|---|
| climb | `cubic-bezier(0.22,1,0.36,1)` | 420 ms | Content rising into place (`animate-rise`) |
| approach | `cubic-bezier(0.65,0,0.35,1)` | 300–14 000 ms | Sheets, hero drift |
| tap | scale 0.98 | 120 ms | Pressed buttons |

**Rules:**
- Animate opacity and transform only.
- No continuous loops except the single hero drift.
- `prefers-reduced-motion` turns all of it off.
- Native transitions handle navigation; we don't fake page curls.

## 6. Components (built in Phase 5)
- **Tab bar:** night glass (`bg-night/88 + blur`), five items, with a 2 px dusk active mark. Labels are always visible.
- **Hero band:** a plate, a scrim, an eyebrow (mono, dusk) and a display title.
- **Primary button:** a 56 px pill, magenta on paper or paper on night, with one per screen. **Secondary:** an outline or text button.
- **Field:** a 52 px row with a floating label and a hairline bottom rule. Errors appear below in `danger` with the exact server message.
- **Airport picker:** a full-screen sheet with a search field pinned under the safe area. Each row shows `CODE` (mono), city, airport name and country. Recent airports come first, and there are at most 8 results.
- **Date picker:** the native one (`<input type="date">` opens the OS picker), with a min date of today in the departure airport's zone.
- **Stepper:** passengers, with 44 px minus/plus targets and a haptic tick on change.
- **Status chip:** the text label from the server's customer copy, using the truth-state colours.
- **Offer card:** aircraft photo, type, year and seats, partner, **total price and currency (mono)**, taxes, a validity countdown, and "View offer". Acceptance happens only on the offer detail, through a confirmation sheet.
- **Sheet:** a bottom sheet on night with a 28 px top radius and a drag handle. Destructive or commercial confirmations are always a sheet with an explicit labelled button; never a swipe.
- **Empty state:** a photo band, one honest sentence and one action. It never shows fake rows.
- **Offline banner:** a thin bar under the safe area reading "You're offline — showing saved information".

## 7. Touch and accessibility
- **Targets:** at least 44×44 pt for everything tappable. Tab items fill the bar.
- **Contrast:** at least 4.5:1 for text. Over photography, contrast is guaranteed by the scrim.
- **Screen readers:** every icon-only control has an `aria-label`; decorative images use `alt=""`.
- **Reading order:** the hero title, then the action, then the details. Focus is moved to the sheet title when a sheet opens.

## 8. Platform adaptation
- **Shared on both platforms:** a single visual language, and the same tab bar.
- **iOS:** swipe-back is handled by the router history.
- **Android:** the system back button goes back, and on a root tab it exits.
- **Feedback:** haptics are light impacts on selection and success notifications on submit (Capacitor Haptics).
- **Status bar:** light content over night; dark over paper screens once scrolled (Phase 5).
