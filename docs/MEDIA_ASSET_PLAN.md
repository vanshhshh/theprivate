# Homepage film: media asset audit and acquisition plan

Prepared 2026-11-10.

## 1. Audit

Before this pass, the repository contained **no photography or video at all**. The homepage was entirely procedural Three.js, and that implementation has been removed.

Sources searched for licensed media: Wikimedia Commons (API, about 300 candidates reviewed visually), Openverse (CC-licensed Flickr and Commons), Pexels, and Unsplash. Pexels and Unsplash pages block automated access, so their candidates were found by web search and checked through their CDNs.

### Acquired and in use

| ID | Plate | Source | Licence | Use |
|---|---|---|---|---|
| C-1 | Embraer Lineage 1000 cabin: cream seat, walnut table set for tea, window line (4000×2664) | JetRequest.com via Wikimedia Commons | CC BY-SA 3.0. Our keyed derivative is also CC BY-SA 3.0, with credit at `/legal/media-credits` | Acts 1–3 |
| S-1 | "Summer above the clouds": golden-hour sea of clouds with the horizon (4608×3072) | Liane Metzler (Commons, via Unsplash) | CC0 | Seen through the window, then acts 3–6 |
| S-2 | "Aerial cloud sunset": a sunset cloud deck seen from above (5616×3744) | Christian Seeling (Commons, via Unsplash) | CC0 | Acts 6–7 |

All files are downloaded and stored locally in `public/media/film`. Nothing is hotlinked. Rebuild with `python scripts/media/build_film_assets.py`.

### Rejected (and why)

- **Gulfstream GV "pre-flight paint scheme" (CC0, 4601×2588).** It looked like the ideal air-to-air shot, but it is an airbrushed or CG livery concept, not a photograph, and it carries Gulfstream and BMW Rolls-Royce marks.
- **About 90 business-jet "in flight" photos on Commons and Openverse.** These are planespotter shots: gear down on approach, grey overcast, airline liveries and registrations, telephoto from the ground. They are not advertising grade, and they do not match the golden-hour grade.
- **Pexels and Unsplash "private jet in flight".** Free results are airliners, turboprops and light piston aircraft. The business-jet air-to-air images on those sites are Unsplash+ or Getty (paid).
- **Other trade-show cabin photos.** Many are real and high resolution, but they show people, show-floor lighting or tarmac through the windows. C-1 was the only one with a clean, warm, people-free composition and keyable windows.

## 2. Missing assets (required to complete the film)

Nothing below has been substituted. Until J-1 exists, the aircraft acts play over the sky alone in production, and development builds show a labelled slot.

### J-1: Air-to-air tracking plate of the hero aircraft (REQUIRED: interim image in use)

**Interim, 2026-11-10:** ThePrivate supplied `media-src/jet-supplied.png` (1672×941). Its C2PA content credentials identify it as **AI-generated (OpenAI)**. The build pipeline:
- inpaints the generated nacelle lettering;
- cuts out the aircraft (rembg `isnet-general-use`);
- mirrors it so its key light matches S-1's sun;
- composites it over S-1.

It is disclosed in the film's caption ("AI-generated image") and on `/legal/media-credits`. Known limits:
- It is below the 6K spec. The 1440 px cut-out is crisp at its on-screen size (60 vw on desktop), but there is no headroom for close-ups.
- It is a single still, not footage, so the aircraft moves as a plate with no change in perspective.
- It has generative geometry quirks: the winglets are mismatched and the T-tail is asymmetric.

Replace it with the licensed photography specified below. Then set `generated: false` in `media.ts`, and the disclosure disappears.

| | |
|---|---|
| Scene | Acts 4–5: the aircraft appears beside the camera after we exit the window, then climbs up the frame (counter-scroll) |
| Description | One modern long-range business jet (e.g. a Global, Gulfstream G-series or Falcon class), clean white livery, **no readable registration** (removed in post, or authorised), gear up, flaps clean |
| Camera | Air-to-air from a camera ship. Front three-quarter, about 20° off the nose, camera slightly below the aircraft's wing line. The aircraft climbing 10–15° through the shot. |
| Lighting | Golden hour, sun about 10–15° above the horizon, **camera-left**, warm key on the fuselage, cool sky fill. This matches S-1. |
| Background | Above a broken-to-solid cloud deck. A clean plate (same move, no aircraft) is strongly preferred for compositing. |
| Deliverable A (stills) | 6K+ RAW or 16-bit TIFF, 3–5 frames of the same pass, plus an alpha matte, or a clean enough sky to key |
| Deliverable B (video, preferred) | 4K DCI or UHD, 60 fps or higher, 10-bit (ProRes 422 HQ or better), 8–12 s continuous pass. We export a 2–3 s section as a 120–180-frame WebP or AVIF image sequence for scroll scrubbing, plus an H.264/AV1 fallback. |
| Aspect | Shot 16:9 or wider, with room to crop 9:16 for mobile |
| Transition | Enters from the same sky as S-1, so the grade, sun direction and cloud altitude must match S-1 |
| Licence | Perpetual, worldwide, web and marketing use. Model and property release from the aircraft owner or operator. Trademark clearance for any visible OEM marks. |

### Recommended (raises quality further; not blocking)

| ID | Scene | Description | Spec |
|---|---|---|---|
| C-2 | Act 2 | Motion-control push toward a cabin window, matching C-1's framing. This would replace the 2D push with true parallax between the seat, table and window. | 4K 60 fps 10-bit, 6–8 s; or 240-frame 4K image sequence; daylight through the windows, or windows blown out for keying |
| T-1 | Act 3 | Through-the-window plate: the camera starts on the inside of the glass and moves out into open sky | 4K 60 fps, 3–4 s; can be CG, but it must be photoreal and graded to S-1 |
| S-3 | Act 6 | A continuous tilt from the horizon down to the cloud deck (one shot, replacing the S-1 → S-2 crossfade) | 4K 60 fps drone or air-to-air, 6–8 s, golden hour |

## 3. Where to source J-1 (in order of fit)

1. **Commission an air-to-air shoot** with an operator in ThePrivate's network (UAE or India). This gives the best fit, a real ThePrivate partner and a clean release. Specialist air-to-air crews are listed in industry directories; budget for a camera ship and pilot hours.
2. **License from the manufacturer's media library.** OEM press kits (Bombardier, Gulfstream, Dassault, Embraer) carry air-to-air stills and B-roll, but the usual terms are **editorial only**. Ask for a commercial licence in writing, and note that marketplace use implies endorsement.
3. **Paid stock, under a commercial licence:** Getty Images, Shutterstock and Adobe Stock. All have advertising-grade "business jet air-to-air golden hour" clips (for example, Getty 808-21, "Aerial pan private jet flying above clouds"). Buy the extended or unlimited licence, check releases, and remove registrations.

When J-1 arrives, add it to `scripts/media/build_film_assets.py`, then set `JET` in `src/components/cinematic/media.ts`. The choreography is already built for it.

## 4. Site-wide scene plates (added 2026-11-10, frontend redesign)

Built by `scripts/media/build_scene_assets.py`. They are graded to the film's palette and credited at `/legal/media-credits`.

| ID | Plate | Author · licence | Used on |
|---|---|---|---|
| ramp-dusk | Business jet silhouetted on the ramp at sunset | John Murphy · CC BY-SA 2.0 | Aircraft for sale, sell, home |
| wing-dusk | Wing above a sea of clouds at sunset | Pinakpani · CC BY-SA 4.0 | One-way offers, home |
| cabin-aisle | Gulfstream G550 cabin aisle | Matti Blume · CC BY-SA 4.0 | About, search results, empty dashboard |
| cabin-warm | Long business-jet cabin, warm light | Matti Blume · CC BY-SA 4.0 | Sign in / create account, home |
| flight-deck | Gulfstream G280 instrument panel (windscreen cropped away) | Matti Blume · CC BY-SA 4.0 | Flight partners, partner programme, home |
| window-light | Cabin window at first light, cropped to exclude a crew member | U.S. Navy (Justin E. Stumberg) · public domain | Request flow, contact, about |

### Still wanted (would raise quality; not blocking)

- **Airport / FBO arrival scene:** golden hour, a private terminal or the steps of a business jet. For the trip itinerary and booking confirmation. 4K or larger, landscape.
- **Destination photography** for the account's "next journey" card: one licensed, graded image per major destination (Mumbai, Delhi, Dubai, Bengaluru…), keyed by airport. Today the card uses the film's sky.
- **Licensed air-to-air photography** to replace the interim AI-generated J-1 (§2).
- **Listing photography standards for sellers:** guidance that encourages 16:10 exterior and cabin photos at 3,000 px or more, so the editorial gallery and feature pages have strong images. Today they use whatever sellers upload.
