# Design direction: "From the sky to the chart, and the lights below"

## The idea

The approved opening film follows the journey itself:
- a photographed cabin;
- out through the window into golden sky;
- the aircraft climbing;
- the camera tilting down through the clouds;
- **the night below, every airport a point of light, the route drawn across it, "Where to?"**

ThePrivate's whole frontend is built from those images and nothing else. Three surfaces recur, always in this order of meaning:

| Surface | What it is | What it means | Where |
|---|---|---|---|
| **Scene** | A full-bleed licensed photograph in the film's grade, with editorial type and the header floating over it | *This is the experience* | The opening of every public route, empty states, chapters |
| **Night map** | Every real airport in our reference data (6,057) as a point of light, with the great-circle route drawn across it | *This is your journey* | Planner (home and `/charter`), search results, one-way offers, trip and booking itineraries, the film's ending |
| **Chart** | Warm paper and ink | *This is the information* | Lists, comparisons, forms, specifications |

Customers always know where they are. A photograph sets the mood, the map places them on the earth, and paper is where they decide.

## Principles

1. **One image, one idea.** Each scene carries a single statement in display type. No paragraphs over photographs.
2. **Geography is real.** The map is drawn only from real coordinates. No decorative globes and no invented routes.
3. **Nothing pretends.** No placeholder photography, illustrative aircraft presented as listings, fabricated offers or padded counts. An empty state is a real photograph with one honest sentence and a way forward.
4. **No dead space.** Every viewport has a purpose. Where there is no content, there is a scene; where there is a journey, there is the map.
5. **Restraint in motion.** The camera moves the way an aircraft does: eased, purposeful, never looping. Type clears like cloud.
6. **Customer language.** Journeys, offers, flight partners. Internal vocabulary lives only in internal workspaces.
7. **Honesty about who flies.** ThePrivate arranges; licensed air operators operate. This is stated wherever a booking decision is made.

## Palette, type and grade

These come directly from the film. Full tokens are in `DESIGN_SYSTEM.md`.
- **Colours:** night `#0e1418`, paper `#f3f0e8`, dusk `#e2b07a` (horizon glow), haze `#c8d3dc` (upper sky), and magenta `#a3245c`, which is the only action colour and the far end of every route line.
- **Type:** Newsreader for statements (italic for emphasis, as in "*verified.*"), Instrument Sans for the interface, IBM Plex Mono only for codes and times.

## What we deliberately do not do

- No 3D aircraft, cabins or clouds; no low-poly or AI-generated stand-ins. The interim J-1 aircraft is the documented exception and is disclosed.
- No glass everywhere. Glass appears only where a working surface floats on a photograph or the map: the planner, the header, the mobile menu and the account tabs.
- No card grids of identical tiles. No graph paper as decoration. No endless or floating animation.
