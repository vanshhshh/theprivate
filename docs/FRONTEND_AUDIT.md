# Frontend audit

Audited on 2026-11-10, before the cinematic redesign. Baseline: `npm run build` succeeds, and Playwright passes **24/24** (16 desktop, 8 mobile).

## Inventory

- **70 routes** in 5 groups: public (17), auth (2), customer account (8), operator workspace (13 + onboarding 3), and admin console (25).
- **About 6,500 lines** of frontend.
- **Shared layer:**
  - `components/ui/`: Button, form controls, display primitives (PageHeader, Pill, EmptyState, Notice, DL, Table, Stat), and InlineAction.
  - `components/domain/`: chrome (header/footer), mobile nav, console shell, sub-nav, charter search, request form, airport combobox, itinerary, status labels, and auth forms.
  - `components/motion/`: Reveal (CSS scroll timelines), FlapText, and RouteArc (SVG great circle).

## Current visual design

The design language is "Sectional", based on VFR charts: paper `#f3f0e8`, ink, sectional blue, and one magenta accent. Type is Newsreader (display), Instrument Sans (UI) and IBM Plex Mono (codes). It is well engineered: accessible forms, honest status pills, and real states throughout.

The homepage film, rebuilt in the previous phase, is photographic, cinematic and dark. **Nothing after it matches it.** Every other route is the same paper page: an eyebrow, a 48 px serif title, an underline, then content. There is no imagery anywhere except seller-supplied listing photos.

## Weak pages (in order of customer impact)

| Route | Problem |
|---|---|
| `/charter` | A form on a blank page. The search is good, but the page has no sense of a journey. Results are a ruled table-like list. |
| `/charter/request` | One long form with internal language ("Request for quotation", "Tell operators", "Anything else operators should know"). |
| `/empty-legs` | Industry term in the title and navigation. A 3-column grid of cards. |
| `/aircraft-for-sale` and `[id]` | A generic e-commerce grid. The detail page is a spec sheet. |
| `/about`, `/contact` | Text-only pages. About explains the verification workflow at length. |
| `/operators`, `/for-operators` | Operators sit in the primary navigation of a customer site, and internal lifecycle pills are shown publicly ("Agreement signed"). |
| Auth | A good structure, but the right panel is an inverted SVG chart rather than imagery. |
| `/account/*` | The dashboard is two ruled lists. Trips are a data table. The trip page shows "Quotes", "Revision 2" and "Operator terms". |
| Operator and admin | Coherent, dense and usable. They only need the shared tokens refreshed. |

## Repeated or inconsistent patterns

- `PageHeader` is used on almost every route. It is the main source of sameness.
- `gap-px bg-line` grids of cards appear on 8 routes.
- Filters on `/empty-legs` and `/aircraft-for-sale` are hand-rolled with different markup.
- `Status` labels are shared between customer and internal screens, so customers see internal language ("Awaiting operator", "Quotes received", "Finding operators").
- Templates exist only for the public group (a CSS rise animation). Account and console use a `page-enter` class.

## Internal terminology on customer screens

These appear in navigation, headings, buttons or status labels:
- Operators, Empty legs, RFQ, Request for quotation
- Quote, Quote revision, Operator terms
- Verified operator (as a pill on every result)
- Listed by regulator, Agreement signed
- NM (nautical miles), Block hours, Pax
- Sales desk, Operations desk

## Media

- **Existing:** homepage film plates (cabin, two skies, aircraft cut-out) and seller listing photos served from `/api/files`.
- **Missing:** imagery for every other route. Six licensed scene plates have now been sourced and graded (see `MEDIA_ASSET_PLAN.md`).

## Motion

- The film uses GSAP ScrollTrigger.
- Elsewhere: CSS scroll-driven reveals and parallax, a 420 ms rise on public page entry, FlapText on prices, and the RouteArc draw.
- There are no route transitions and no navigation pending feedback.

## Working interactions that must be preserved

- Airport combobox with keyboard support.
- GET search to `/charter`.
- Request form: one way, return, multi-leg legs, and preserved values on error.
- ActionForm states (pending, field errors, success).
- InlineAction confirm and reason step.
- Accept and decline offers; cancel a request or booking.
- Empty-leg enquiry, sale enquiry with honeypot, sell-aircraft upload.
- Notifications open and mark-all; settings.
- Mobile menu.
- All operator and admin flows.
- Every selector used by the e2e suite.
