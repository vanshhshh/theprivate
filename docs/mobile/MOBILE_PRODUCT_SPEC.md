# ThePrivate mobile: product specification

Phase 2 deliverable. This is the customer app, first release. Company (operator) and admin work stays on the responsive website and opens in the in-app browser when needed.

## Principles
1. **Only real data.** There are no fictional offers, prices, activity or "people viewing" counters. Every empty state is designed rather than padded.
2. **Honest states.** A request is not an offer, an offer is not a booking, and a booking is not paid until the server says so. Status words come from the website's existing status copy (`src/domain`), so web and app always agree.
3. **Plain words.**
   - "One-way offers", not "empty legs".
   - "Flight request", not "RFQ".
   - "Flight partners", not "operators".
4. **ThePrivate arranges flights; licensed partners operate them.** This is stated wherever an aircraft or price appears.
5. **International from the start:**
   - airports worldwide, using the 6,057 in the reference data;
   - currency as returned by the server;
   - dates in the device locale;
   - **times in the airport's own time zone**, labelled.

## Navigation

Bottom tab bar, five items, the same on iOS and Android, with platform-native transitions inside each tab:

| Tab | Icon idea | Purpose |
|---|---|---|
| **Discover** | horizon | Brand film still, start planning, live one-way offers, aircraft, your next journey |
| **Plan** | route line | The flight planner and search results |
| **Journeys** | ticket | Requests, offers, bookings and trips, plus the inbox |
| **Explore** | compass | One-way offers and aircraft for sale (segmented) |
| **Profile** | person | Account, preferences, security, support, legal, sign out, delete account |

- **Inbox:** a bell in the Discover and Journeys headers, with an unread dot from `/notifications`.
- **Signed out:** Discover, Plan (search) and Explore work fully. Journeys and Profile show a sign-in invitation. Submitting a request or enquiry asks the user to sign in, then **returns to the same form with the input preserved**.

## Screens and data sources

`API` refers to the planned `/api/mobile/v1/*` handler. Each one wraps the existing service listed here.

### Discover
- **Hero:** a full-bleed still from the opening film (cabin-window plate) with the line "Where to?" and a single **Plan a flight** button. On capable devices it plays a 3-second slow parallax; otherwise it's a still.
- **Next journey card** (signed in): the nearest upcoming booking, or the most recent open request with its true status.
- **One-way offers rail:** up to 6 **live** listings (`listLiveEmptyLegs`). The rail is hidden when there are none; it never shows placeholders.
- **Aircraft for sale rail:** up to 6 **published** listings (`listPublishedListings`).
- **"How ThePrivate works":** 3 short lines, which is also the store-review explanation of the service model.

### Plan: the flight planner
A single composed screen, not a wizard:
- **Route:**
  - From and To fields open a **full-screen airport search sheet**;
  - matching on name, city, IATA and ICAO, debounced 200 ms, with at most 8 results (`searchAirports`);
  - recent airports appear first;
  - From and To can be swapped;
  - choosing the same airport for both is blocked with a clear message.
- **Trip:** One-way or Return (segmented). The return date appears only for Return.
- **Date:** a native date picker, with no past dates. Times are optional (HH:MM, local to the departure airport).
- **Passengers:** a stepper from 1 to 400 (the server's limits).
- **Aircraft category:** optional chips (turboprop, light, midsize, super-mid, heavy, helicopter), using the server's `AircraftCategory` values.
- **Action:** **Show aircraft** → results.

### Plan: results (`searchCharter`)
- **Header:** route, date and passengers; distance in nautical miles when known.
- **Each result card shows:**
  - an aircraft photo (approved images only, otherwise a neutral category illustration labelled "Illustrative");
  - the type label;
  - seats;
  - the flight partner name;
  - the **availability signal exactly as labelled by the server** (operator-declared and freshness-checked);
  - a range note (OK / may need a stop / unverified);
  - an **indicative price range only when the server returns one**, always labelled "Indicative — the final price comes in the partner's offer".
  
  **No result is ever presented as bookable.**
- **Primary action:** **Request this flight** pre-fills the request with the route and the chosen aircraft category.
- **Empty or blocked:** "No aircraft listed for this journey yet — we will find one for you", with a **Send a flight request** button. This is the website's honest pattern.

### Flight request (`createRfq`)
A single review screen with collapsible sections, prefilled from the planner:
1. **Route and date:** one or more legs, with return and multi-leg support up to 6 legs, as the server allows.
2. **Passengers** and pets on board.
3. **Preferences:** category, and requirements as free text (max 2,000 characters).
4. **Contact:** name and phone, prefilled from the profile.
5. **Review:** the total summary, then **Submit request**.

**Behaviour:**
- **Draft:** saved locally as the user types; contact details are stored only in memory.
- **Idempotency key per draft:** a retry after a network drop cannot create a second request.
- **Success:** the confirmation shows the request reference (`TP-XXXXXX`), then opens the request in Journeys.

### Journeys (`listCustomerRfqs`, bookings)
- **Sections:**
  - **Upcoming** (bookings that are CONFIRMED, PAYMENT_PENDING, PAID or IN_PROGRESS);
  - **Requests and offers** (open RFQs);
  - **Past** (COMPLETED, CANCELLED, EXPIRED).
- **Status chips:** the server status translated with the website copy:
  - Request submitted;
  - Finding aircraft;
  - Offers received (n);
  - Offer accepted, awaiting partner confirmation;
  - Booking confirmed;
  - Payment pending;
  - Paid;
  - Completed;
  - Cancelled.
- **Pull to refresh;** an offline banner when there's no network.

### Request detail (`getCustomerRfq`)
- **Header:** route and dates, passengers, and the status timeline.
- **Offers:**
  - side-by-side comparison cards that scroll horizontally, each showing aircraft, year, seats, partner, **total price and currency**, taxes and fees as provided, inclusions, conditions, **valid-until countdown**, and revision;
  - a "Compare" toggle that aligns the key rows across offers.
- **Accept:**
  - an explicit button opens a confirmation sheet that restates the price, currency, partner and conditions;
  - the user then presses **Confirm acceptance**, which sends `expectedRevision`;
  - **no swipe or one-tap acceptance.** If the offer was revised meanwhile, the server refuses the stale revision and the app shows the new terms.
- **Decline offer** and **Cancel request** each have their own confirmation.

### Booking / trip detail (`getCustomerBooking`)
- **Itinerary:**
  - legs, showing departure and arrival airports with **local times and time-zone labels**;
  - aircraft, partner and the booking reference;
  - status, plus the payment status exactly as the server reports it.
- **Also:**
  - instructions;
  - documents (opened through the authorised `/api/files/:id` with the bearer token);
  - messages and updates (the notifications for this booking);
  - support contact.
- **Cancel booking:** follows the server's rules and copy, with a confirmation sheet.

### Explore
- **One-way offers:**
  - a list (`listLiveEmptyLegs`) with a filter by departure country or airport and an "after" date;
  - each card shows route, date window, aircraft, seats, price **only if published and valid**, and conditions;
  - **detail** (`getLiveEmptyLeg`) offers **Enquire** with passengers and a message (`enquireEmptyLeg`), plus Share (a public URL).
- **Aircraft for sale:**
  - a list (`listPublishedListings`) with filters for category, manufacturer, year and price ("on request" supported);
  - **detail:** a photo gallery (public media only), specifications, location, the asking price or "Price on request", and **Enquire** (`submitBuyerEnquiry`);
  - seller contact details are never shown;
  - Share.

### Inbox (`Notification`)
Read and unread groups. Tapping an item marks it read and opens its in-app destination. Links to web-only areas (company workspace) open in the in-app browser. **Mark all read.**

### Profile
- **Details:** name, e-mail (read-only), phone, preferred currency and locale.
- **Notifications:** push on or off per category; e-mail preferences.
- **Security:** Face ID / fingerprint lock; sign out of this device.
- **Help:** support (e-mail, contact page), Privacy, Terms, media credits.
- **Delete account:** a confirmation creates a deletion request (B4) and signs the user out.
- **Partners:** a link for "Are you a flight partner?" opens the website.

### Authentication screens
- **Welcome:** a full-bleed photo with **Sign in**, **Create account**, and **Continue browsing**.
- **Sign in, Create account and Forgot password.**
- **"Check your inbox":** handles the verification link returning through the app link.
- **Biometric unlock:** shown when returning after more than 5 minutes in the background, if enabled.

## Route inventory (app ↔ web)

| App route | Web equivalent (deep link) | Auth |
|---|---|---|
| `/discover` | `/` | – |
| `/plan`, `/plan/results` | `/charter`, `/charter?from=&to=&date=&pax=` | – |
| `/plan/request` | `/charter/request` | sign in to submit |
| `/journeys` | `/account/trips` | ✓ |
| `/journeys/request/:ref` | `/account/trips/:ref` | ✓ owner |
| `/journeys/booking/:ref` | `/account/bookings/:ref` | ✓ owner |
| `/explore/one-way`, `/explore/one-way/:id` | `/empty-legs`, `/empty-legs/:id` | – (sign in to enquire) |
| `/explore/aircraft`, `/explore/aircraft/:id` | `/aircraft-for-sale`, `/aircraft-for-sale/:id` | – (sign in to enquire) |
| `/inbox` | `/account/notifications` | ✓ |
| `/profile` | `/account/settings` | ✓ |
| `/auth/*` | `/sign-in`, `/sign-up` | – |
| (in-app browser) | `/claim/:token`, `/operator/*`, `/for-operators`, `/legal/*` | web session |

## Key journeys (acceptance scenarios)
1. **Guest searches:** Discover → Plan → choose BOM → DXB → date → 4 passengers → results or the honest empty state → Request → sign up → verify e-mail → return to the prefilled request → submit → reference shown → Journeys.
2. **Offer arrives:** push "Your journey has an update" → tap → biometric unlock → request detail → compare 2 offers → accept with the confirmation sheet → status "Offer accepted, awaiting partner confirmation".
3. **Booking confirmed:** push → booking detail with local times → open a document → share nothing private.
4. **Buyer enquiry:** Explore → Aircraft → filter → detail → enquire → confirmation.
5. **Offline:** the planner keeps its draft, search shows an offline state with a retry, and submit is disabled with a clear explanation.
6. **Session expired:** any authenticated call returns 401 → the token is cleared → sign in → back to the same screen.
7. **Delete account:** Profile → Delete → confirm → request recorded → signed out.

## Out of scope for release 1
- Company workspace, onboarding fee and admin (these stay on the web).
- In-app charter payment: payment status is shown, and collection follows the existing approved web or offline flow.
- Chat with partners (messages appear as notifications), and multi-currency conversion.
