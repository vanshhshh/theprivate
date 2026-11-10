# Visual refinement report

Completed on 2026-11-10. Screenshots are in `docs/screenshots/visual-refinement/`.

## The problem

Below the opening film, the homepage had three equal cards on a beige background: One-way offers, Aircraft for sale and Flight partners. Each card used an unrelated image:
- an isolated wing;
- a dark tail silhouette;
- a cockpit instrument panel.

The result broke the film's mood. It looked like a template, and the cockpit suggested that ThePrivate flies aircraft. See `before-home.jpg`.

## What replaced it

The cards are replaced by a **full-width, pinned photographic sequence** (`src/components/cinematic/scene-sequence.tsx`) that continues the opening film. As the visitor scrolls, each photograph wipes over the previous one (clip-path), with one short line of copy and one action:

| # | Photograph | Line | Action |
|---|---|---|---|
| 01 | Falcon 6X in flight, gear up (`jet-inflight`) | "Already flying your way." with a live count of one-way offers | See one-way offers |
| 02 | Falcon line-up on the ramp (`jets-ramp`) | "An aircraft of your own." with a live count of listings | Browse aircraft for sale |
| 03 | Business-jet cabin, warm light (`cabin-warm`) | "A more considered way to fly." Licensed operators, with no claim that ThePrivate operates flights | Plan a flight / Meet our flight partners |

**Behaviour:**
- **Desktop:** a pinned stage of about n × 100 svh, with progress hairlines at the top right.
- **Mobile (< 768 px) and reduced motion:** the scenes are stacked full-bleed with a stronger bottom gradient for legibility. There is no pinning or scroll-jacking.
- **Unchanged:** the opening film, links, data and business logic. Only presentation changed.

See `after-home-sequence-desktop.jpg` (five scroll positions) and `after-home-sequence-mobile.jpg`.

## Consistency across the site

The same plates now carry the story elsewhere:

| Page | Before | After |
|---|---|---|
| One-way offers | wing | `jet-inflight` |
| Aircraft for sale, Sell an aircraft, Partner with ThePrivate, empty listings | tail silhouette | `jets-ramp` |
| Flight partners (list and company page) | cockpit | `jet-inflight` (empty state: `cabin-aisle`) |
| Account → trips, empty state | wing | `sky-horizon` (film plate) |
| Invitation (`/claim/*`), onboarding fee | — (new pages) | `cabin-warm` |

The retired images (`wing-dusk`, `ramp-dusk`, `flight-deck`) were deleted from the build and the credits page. Sources, licences and quality notes are in `MEDIA_ASSET_AUDIT.md`.

## New pages, same visual language

The new pages use the same visual language:
- the invitation claim page;
- unsubscribe;
- Admin → Invitations and its preview;
- Admin → Onboarding fees;
- the company onboarding-fee page and its confirmation and receipt.

All of them use the dark hero plate, serif display type and the existing form controls. See `after-claim-page.jpg`, `after-operator-fee-page.jpg` and `after-admin-fees-page.jpg`. Every page returned HTTP 200 with no console or page errors in the production build.

## Known limits

- `jet-inflight` is a daytime photograph graded toward the film. A licensed golden-hour air-to-air photograph would complete the set.
- Crew and FBO photography with model releases is still wanted for the flight-partner pages.
