# Media asset audit (visual refinement)

Audited on 2026-11-10. Every photograph is real, licensed, graded to the film's palette, and credited at `/legal/media-credits`. All are built by `scripts/media/build_scene_assets.py` and `scripts/media/build_film_assets.py`.

## What was wrong (the screenshot you sent)

| Section | Image | Problem |
|---|---|---|
| One-way offers | An isolated wing over a sunset cloud sea | Doesn't show an aircraft or a journey |
| Aircraft for sale | A dark tail silhouette against the sun | The aircraft can't be identified; reads as "dark", not "for sale" |
| Flight partners | A cockpit instrument panel | A generic aviation image; suggests ThePrivate flies aircraft |

The three images also didn't share a story, and they sat in equal-width cards on beige.

## Replacements

| Plate | Photograph | Author · licence | Now used for |
|---|---|---|---|
| `jet-inflight` | Dassault Falcon 6X in flight, gear up, banking (Paris Air Show 2025) | Ibex73 · CC BY 4.0 | Home sequence 01 "Already flying your way"; One-way offers; Flight partners |
| `jets-ramp` | Falcon 2000LXS / 900LX / 8X line-up on static display (EBACE 2018), cropped to exclude a visitor | Matti Blume · CC BY-SA 4.0 | Home sequence 02 "An aircraft of your own"; Aircraft for sale; Sell an aircraft; Partner with ThePrivate; listings empty state |
| `cabin-warm` | Business-jet cabin, warm light (EBACE 2019) | Matti Blume · CC BY-SA 4.0 | Home sequence 03 "A more considered way to fly"; sign-in; onboarding fee page; invitation page |
| `cabin-aisle` | Gulfstream G550 cabin aisle | Matti Blume · CC BY-SA 4.0 | About; results with no aircraft; flight-partners empty state |
| `window-light` | Cabin window at first light (crew member cropped out) | U.S. Navy · public domain | Request flow; contact; about |
| Film plates | Cabin, sky horizon, cloud deck, interim aircraft (J-1) | see `MEDIA_ASSET_PLAN.md` | The opening film (unchanged) |

**Retired and deleted from the build:**
- `wing-dusk` (wing);
- `ramp-dusk` (tail silhouette);
- `flight-deck` (cockpit).

None remain in the code or on the credits page.

**The story is now coherent:** in the air (the Falcon 6X), then on the ground (the Falcon line-up), then on board (the cabin). Each aircraft is identifiable; each image is captioned "Illustrative aircraft, not a listing" where an aircraft could be mistaken for a listing.

## Quality notes

- The `jet-inflight` source is 2562 px wide. That's sharp at full-bleed on 1440–1920 px displays and at 1× on 2560 px; slightly soft on 4K at 2×. A higher-resolution air-to-air plate would improve large-screen sharpness (see `MEDIA_ASSET_PLAN.md` J-1).
- `jet-inflight` is a blue-sky daytime shot, while the film is golden hour. It's graded toward the film's shadows and highlights, but it remains a daytime scene. A golden-hour air-to-air photograph is the remaining upgrade.
- Show registrations visible in the photos (for example `F-HDOR`, `F-WSIX`) belong to manufacturer demonstrators at public air shows. They are not listings.

## Still wanted

- Licensed golden-hour air-to-air photography (it would replace both `jet-inflight` and the AI interim J-1).
- Arrival or FBO imagery, and destination imagery for the account's "next journey" card.
- People: professional crew and ground staff imagery with model releases, for the flight-partner pages ("the people responsible for providing the flight").
