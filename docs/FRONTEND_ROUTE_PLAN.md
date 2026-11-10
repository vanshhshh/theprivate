# Frontend route plan

Each route is a scene in the same film. Backend behaviour, data, form field names and action contracts are unchanged.

## Navigation

- **Primary (public):** Plan a flight · One-way offers · Aircraft for sale · About. Then Sign in, and the primary action "Plan a flight" (or the account name).
- **Footer:**
  - Travel: Plan a flight, One-way offers, Aircraft for sale, Sell an aircraft.
  - Company: About, Contact, Our flight partners, Partner with ThePrivate.
  - Legal: Terms, Privacy, Photography credits.
- Operator and partner links leave the primary navigation; they are business concepts.

## Public

| Route | Scene (photo) | Composition | Key copy changes |
|---|---|---|---|
| `/` | The film (unchanged) | Film, then planner on chart paper, then three editorial chapters, then the final call | "How it works" in customer terms; trust in one sentence |
| `/charter` (no search) | **Sky-horizon** (the film's sky continues) | A full scene with a glass **flight planner** floating on it | "Where would you like to go?" Natural prompts |
| `/charter?…` (results) | A **cabin-aisle** band | The journey header (codes, cities, distance in km), then a selection of aircraft as editorial rows | "N aircraft for your journey" · "Request this aircraft" · indicative prices labelled "Estimate" |
| `/charter/request` | A **window-light** side panel | A concierge in three steps (Journey, Travellers, You) with the summary alongside | "Your flight request" · "Anything we should know" |
| `/empty-legs` | **Wing at dusk** | Scene, filters on glass, then offers as journey rows | "One-way offers": "Seats on flights already going your way" |
| `/empty-legs/[id]` | Route arc on night | Journey header, details and an enquiry panel | "This flight can change if the aircraft's schedule changes" |
| `/aircraft-for-sale` | **Ramp at dusk** | Scene, filter bar, then an editorial gallery (the first listing large) | "Aircraft for sale"; a brokerage tone |
| `/aircraft-for-sale/[id]` | The listing's own photo, full bleed (else typographic) | A feature article: hero, specification sheet, story, sticky enquiry | "Specification as provided by the seller" |
| `/sell-aircraft` | Ramp band | Form in chapters | Unchanged fields |
| `/about` | **Cabin-aisle** | Three short chapters | Trust in a sentence, not a workflow |
| `/contact` | **Window-light** | Split: image and form | |
| `/operators`, `/operators/[slug]` | **Flight-deck** band | "Our flight partners": companies and approved aircraft | Internal lifecycle pills removed; "Checked by ThePrivate" |
| `/for-operators` | Flight-deck | Business page for partners (operational terms allowed) | |
| Legal, credits, forbidden, 404 | Chart paper | Typographic | |
| `/sign-in`, `/sign-up` | **Cabin-warm** full-height panel | Form on paper beside the scene | "Welcome back" / "Create your account" |

## Customer account

| Route | Composition |
|---|---|
| Layout | A dusk band with a greeting, pill tabs on glass, then chart paper |
| `/account` | **Next journey** leads (itinerary, status in plain language and next step), then requests with offers waiting, then the inbox preview. Empty state: an invitation to plan a first flight |
| `/account/trips` | Requests and trips as journey rows (no data table) |
| `/account/trips/[ref]` | The journey header, then **offers to compare** side by side: total, aircraft, seats, included, conditions, valid until. Actions: "Choose this offer" / "Decline" |
| `/account/bookings/[ref]` | **Digital itinerary**: journey, status, next step, timeline, summary and cancel |
| Inbox, settings, listings | Calm paper; rows instead of tables where possible |

## Internal workspaces

- `/operator/*` and `/admin/*` keep their structure, terminology and density.
- They get the refreshed tokens, rail, buttons, forms and tables, plus a 160 ms crossfade between routes.
- No cinematic scenes.

## Shared foundation (Phase 3)

`globals.css` tokens and utilities · `SceneHero`, `Chapter`, `Journey` · header (glass, transparent over scenes, pending links) · footer · mobile menu (full-screen night glass) · buttons · form controls · `Status` audience mapping · templates with ViewTransition · loading states (`loading.tsx` for charter results and account).

## Test impact

Customer-copy changes that the e2e suite asserts on are updated in the specs **in the same commit**, with each test's intent unchanged.

Messages returned by server actions (for example "Enquiry sent to the operator", "Our sales desk will connect you") live in backend code. They are **not** changed in this frontend-only phase. Copy rendered by pages, such as the request-sent notice, is frontend and is changed.

## Route storyboards (second pass, 2026-11-10)

Each row gives purpose · primary visual · composition · hierarchy · interaction · motion · mobile.

| Route | Purpose | Primary visual | Composition | Hierarchy | Interaction | Motion | Mobile |
|---|---|---|---|---|---|---|---|
| `/` film | Set the world | Cabin, window, sky, aircraft, cloud deck, **night map** | Pinned 600 vh shot | One line per act | Scroll; skip link | GSAP scrub; map camera at the end | Same shot, portrait framing |
| `/` planner | Start a journey | Night map, live | Glass planner bottom-left; route framed top-right | Statement, then planner | Pick airports and the camera flies | Route draw and label resolve | Map above, planner below |
| `/` chapters, trust, close | Introduce offers, sales, partners, trust | Wing, ramp, flight deck, warm cabin | Three tall photographic chapters, a full-width trust scene, a closing statement | Live count, title, one line | Whole-tile links | Reveal; hover zoom | Stacked tiles |
| `/charter` | Plan a flight | Night map over the darkened cloud deck | The same stage as the homepage, with an h1 | "Where would you like to go?" | As above | As above, title resolve | As above |
| Results | Choose an aircraft | Route map band | Journey typography over the map; editorial rows (photo or seats panel, spec, price, action) | Count, aircraft, price, action | "Change journey" (glass), request this aircraft | Map draw; row reveal | Rows stack, photo first |
| Results (none) | Keep the journey moving | Cabin aisle scene | `SceneEmpty` | "We will find one for you" | Send a flight request | Reveal | Full width |
| `/charter/request` | Brief us | Window light | Band, then a 3-step form with a night summary | Step title, fields | Continue / Back; errors jump to their step | Step resolve | Summary below the form |
| `/empty-legs` | Discover offers | Wing at dusk | Scene, filter rule, journey rows; empty: cloud deck `SceneEmpty` | Route, time, price | Filter; row link | Arc draw; reveal | Rows stack |
| `/empty-legs/[id]` | Decide on an offer | Route map | Journey over the map; details and an enquiry panel | Journey, window, price | Enquire / sign in | Map draw | Panel below |
| `/aircraft-for-sale` | Browse | Ramp at dusk | Scene, filters, editorial gallery with the first listing as a feature; empty: warm cabin `SceneEmpty` | Aircraft, year, price | Filters; card link | Image reveal; hover | One column |
| `/aircraft-for-sale/[id]` | Read a feature | The seller's own photo | Full-bleed hero, spec grid, drop-cap story, gallery, sticky enquiry | Name, price, spec | Enquiry form | Settle; image reveal | Enquiry after the story |
| `/sell-aircraft` | List an aircraft | Ramp band | Chaptered form | Chapter titles | Unchanged form | Reveal | Single column |
| `/about` | Trust | Cabin aisle; window light | Full scene, three promises, disclosure scene | Promise titles | Two actions | Resolve; reveal | Stacked |
| `/contact` | Reach us | Window light | Sticky image half beside the form (it starts below the header) | "We are listening." | Form | Resolve | Image band, then form |
| `/operators` and `[slug]` | Meet partners | Flight deck | Band, then name rows (empty: ramp `SceneEmpty`); profile with aircraft and licence | Name, aircraft | Links | Reveal | Stacked |
| `/for-operators` | Business pitch | Flight deck | Scene, four steps, two statements | Steps | Claim profile | Reveal | Stacked |
| Auth | Enter | Warm cabin | Form on paper beside a full-height scene | "Welcome back" | Form | Scene cut | Form only |
| `/account` | Next journey | Cloud deck in the next-journey card; cabin aisle when empty | Greeting, next-journey night card, requests, messages | Next journey | Card and row links | Reveal | Stacked |
| `/account/trips/[ref]` | Compare offers | **Route map header card** | Map card, offer columns, itinerary, details | Total, aircraft, conditions | Choose / decline / cancel | Map draw; FlapText | Columns stack |
| `/account/bookings/[ref]` | Itinerary | **Route map header card** | Map card with departs/aircraft/total, next step, flights, updates, summary | Status, next step | Cancel | Map draw | Stacked |
| Trips, listings, inbox, settings | Manage | Sky band (layout); `SceneEmpty` when empty | Rows, not tables | Journey names | Unchanged | Reveal | Stacked |
| Operator and admin | Work | None (night rail) | Dense tables and forms | Operational | Unchanged | 160 ms crossfade | Rail collapses |
