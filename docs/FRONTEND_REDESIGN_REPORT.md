# Frontend redesign: final report

Completed on 2026-11-10. Planning documents:
- `FRONTEND_AUDIT.md`
- `DESIGN_SYSTEM.md`
- `MOTION_SYSTEM.md`
- `FRONTEND_ROUTE_PLAN.md`
- `MEDIA_ASSET_PLAN.md`

## Concept

**From the sky to the chart.** The opening film ends when the sky resolves into ThePrivate's chart paper, and every page now makes the same move:
- A photographic **scene** in the film's grade, with editorial type and the header floating over it.
- The scene settles onto **chart paper**, where customers read, compare and act.

## Verification

| Check | Result |
|---|---|
| Typecheck | Pass |
| Unit tests (Vitest) | 61/61 |
| Production build | Pass |
| Browser tests (Playwright) | **24/24** (16 desktop, 8 mobile). Baseline before the redesign: 24/24 |
| Backend, database, server actions, route handlers, config | **Not modified** (verified by modification time) |

During the work, the e2e run caught one regression: the `loading.tsx` files I added made `notFound()` return HTTP 200 and would have turned a server redirect into a client-side one. The loading files were removed, and HTTP semantics are restored.

## Routes redesigned

**Public**
- `/` below the film: planner on chart paper, three photographic chapters with live counts, a trust scene and the closing call to action.
- `/charter`: the planner floating on glass over the film's sky.
- Search results: the journey over the cabin, then editorial aircraft rows with approved photos or a typographic panel.
- `/charter/request`: a three-step concierge with a live summary.
- `/empty-legs` and its detail page: "One-way offers".
- `/aircraft-for-sale`: an editorial gallery. The detail page is a feature article.
- `/sell-aircraft`
- `/about`, `/contact`
- `/operators` and its detail page: "Our flight partners".
- `/for-operators`: "Partner with ThePrivate".
- Credits, 404, error.

**Auth:** `/sign-in` and `/sign-up` sit beside the warm cabin scene.

**Account**
- Layout: a sky band with glass tabs.
- Overview: next journey, flight requests, enquiries, messages, and an empty-state invitation.
- Trips, offer comparison, itinerary.
- Inbox, settings, aircraft listings.

**Internal:** the operator and admin consoles keep their structure, density and terminology, and inherit the shared tokens, rail, buttons, forms, pills and a 160 ms crossfade.

**Unchanged:** the opening film's imagery, grade, composition and choreography. Only two lines of copy and a still-mode header fix changed.

## Shared components

- **New:**
  - `SceneHero`, `SceneImage`, `Resolve`, `Chapter`
  - `HeaderOver`, `NavLink` (pending feedback)
  - `Journey` (route signature), `journey-copy`, `ui/styles`
- **Redesigned:**
  - Header (glass and floating) and footer
  - Mobile menu (portalled full-screen night glass)
  - Buttons (pill; `light` and `glass` variants; arrow micro-motion)
  - Form controls (sentence-case labels, 17 px values, magenta focus line)
  - Airport combobox, flight planner, request form (stepper)
  - PageHeader, SectionTitle, EmptyState, Notice, Pill, Itinerary
  - Console shell and rail, SubNav (glass variant)
- **Status:** an `audience="customer"` mapping gives plain-language states. Internal labels are unchanged.

## Animation system

All CSS except the film (GSAP):
- Route "scene cuts": React `<ViewTransition>` in each group's template, with the header anchored. Confirmed firing in Chromium.
- `useLinkStatus` pending hairline.
- Scene settle (1.07 → 1).
- Blur-to-sharp title resolve.
- Scroll-driven photo and type parallax.
- Image clip reveals and journey-arc draw.
- Content reveals.
- Hover micro-motion.

Reduced motion collapses everything to instant, settled states (view transitions take 0 s, and the film shows a single still).

## Media

- The film plates, as before.
- **Six new licensed scene plates:** two CC BY-SA 4.0 by Matti Blume plus a third of his cabins, John Murphy (CC BY-SA 2.0), Pinakpani (CC BY-SA 4.0) and a U.S. Navy public-domain image. All graded to the film and credited.
- Listing, aircraft and partner imagery uses only real uploaded and approved photos, with honest missing-photo states.

## Customer terminology simplified

| Before | After |
|---|---|
| Charter (nav) | Plan a flight |
| Empty legs | One-way offers |
| Operators (nav) | Our flight partners (footer) |
| Request for quotation / Tell operators | Your flight request |
| Search verified aircraft | Show aircraft |
| N verified aircraft | N aircraft for your journey |
| Request quote | Request this aircraft |
| Quotes / Quotes received | Offers / Offers ready |
| Accept this quote | Choose this offer |
| Awaiting operator | Awaiting confirmation |
| Finding operators | Finding aircraft |
| Quote revision | Offer version |
| Verified operator (pill) | "Operated by …" plus one sentence about our checks |
| Great-circle NM | Direct distance in km |
| Pax | Passengers |
| Sales desk / Operations desk | ThePrivate / our team |
| Indicative | Estimate · not an offer |

The operator lifecycle pills and the regulator-tracking statistic were removed from public pages. The legal disclosure ("ThePrivate is not an air operator; the licensed operator named in your offer operates the flight") appears in the footer, on About, on the homepage, and on every offer.

## Tests updated alongside the copy

These e2e selectors were updated to the new wording, with each test's intent unchanged:
- Search button and results heading
- Empty-state title and link
- Request flow: added two "Continue" clicks for the stepper
- Notes label
- Request-sent notice
- "Offers ready", "Choose this offer", "Awaiting confirmation", "You chose an offer"
- "Price on request"
- Mobile menu "One-way offers"

## Browser-tested routes

- **Screenshots at 1440×900 and 390×844:** every public route, sign-in, and the populated customer pages on e2e data (dashboard, trips, offer comparison, itinerary, listings), plus operator and admin overviews.
- **Film frames:** desktop and mobile.
- **View-transition and header behaviour:** checked in Chromium.

## Remaining frontend work and known limits

- **Server-action messages are still in older wording.** Examples: "Enquiry sent to the operator", "Our sales desk will connect you with the seller", "Quote declined", "read the quote terms". They live in `actions.ts` files (backend, out of scope).
- **Not yet given individual layout attention:** the operator onboarding and claim pages, and the legal pages. They inherit the new primitives.
- **Hero aircraft (J-1):** an interim AI-generated image, disclosed. Destination imagery for the dashboard is not yet sourced (see `MEDIA_ASSET_PLAN.md` §4).
- **No contextual loading screens**, to preserve HTTP status semantics. A version placed inside the page below the access checks could be added later.
- **Real-device performance check** on a mid-range phone is still recommended; headless Chromium held 61 fps.
- **Not tested:** Safari and Firefox view-transition behaviour. Navigation degrades to an instant swap where unsupported.

---

# Second pass (master transformation brief), 2026-11-10

## What changed

- **Navigation:** "Plan a flight" is back in the primary navigation. The header action is now "Request a flight" (→ `/charter/request`), so the two no longer duplicate each other.
- **Route experience rebuilt (`RouteMap`):** the graph-paper chart is gone everywhere.
  - The new map is drawn from real data. Every active airport in the reference table (6,057, built by `scripts/media/build_airport_map.ts` into a 32 KB gzipped static file) is a point of light in Mercator. Brighter points mark scheduled-service airports.
  - The real great-circle route draws once with a travelling light, then the endpoint markers and city names appear.
  - The camera eases to frame each route in the free part of the screen.
- **The map is used in:**
  - The **film's ending**: the sunset cloud deck dissolves into the night map and Mumbai→Dubai draws under "Where to?".
  - The **homepage planner** and **`/charter`**: the glass planner floats over the full-bleed live map, and the route draws as airports are chosen. This replaces the form-left/empty-map-right layout.
  - **Search results**, **one-way offer detail**, and the customer's **trip** and **booking** headers.
- **Cinematic empty states (`SceneEmpty`):** they replace the beige panels on one-way offers, aircraft for sale, search results, flight partners, trips, offers-awaited and listings. Each is a real graded photograph, one honest sentence and one alternative action. Nothing is fabricated.
- **No blank image containers:** an aircraft without approved photos shows its seat count and type, labelled "Photos not yet provided by the flight partner", instead of an empty frame.
- **Documentation:**
  - `DESIGN_DIRECTION.md` (new).
  - `DESIGN_SYSTEM.md` and `MOTION_SYSTEM.md`, updated for the map and empty states.
  - `FRONTEND_ROUTE_PLAN.md` with per-route storyboards (purpose, visual, composition, hierarchy, interaction, motion, mobile).

## Screenshots

`docs/screenshots/` holds 20 images captured from the production build: the public pages, the populated customer pages using e2e data, the internal workspaces, three mobile pages, and the film's ending.

## Verification (production build of this pass)

| Check | Result |
|---|---|
| Typecheck | Pass |
| Unit tests | 61/61 |
| Production build | Pass (BUILD_ID newer than all sources) |
| Playwright e2e | **24/24** |
| Live map interaction (Chromium, motion on) | Picking Mumbai, then Dubai: the camera flies, the route draws, labels resolve, no console errors |
| Screens captured on the production build | 26, all HTTP 200, no page errors |
| Backend / database / server actions / config | Not modified. The only new script reads the airport table. |

One unit-test run hung during this pass. A clean rerun passed 61/61 in seconds; the hang did not reproduce.

## Known gaps (honest)

- **Map geography is implied by airport density.** There are no coastline or country outlines, because there is no licensed geographic dataset in the repository. Dense regions (India, the Gulf, Europe, the US) read clearly; sparse regions (oceans, deserts) appear empty. Adding Natural Earth (public domain) outlines would be a straightforward next step.
- **Points are drawn on a 2D canvas** at up to 2× device pixel ratio, with no WebGL. It redraws only while moving. During the film's final act, the frame rate dips (about 41 fps headless) while the map's draw overlaps the film's scrub.
- **Still not individually composed:** operator onboarding and claim pages, and the legal pages. They inherit the shared primitives.
- **Server-action messages are unchanged** (backend), for example "Enquiry sent to the operator".
- **Media still wanted:** licensed air-to-air photography (to replace the AI-generated J-1), destination imagery for the next-journey card, and an arrival or FBO scene. See `MEDIA_ASSET_PLAN.md` §4.
- **Not tested:** a real mid-range phone, and Safari or Firefox view transitions.
