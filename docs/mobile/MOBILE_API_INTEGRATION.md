# Mobile API integration

The app talks to the **existing** ThePrivate backend through `/api/mobile/v1/*`, a thin transport layer added to the Next.js app. Each handler:
- authenticates the bearer session;
- validates input with the **existing** zod schemas;
- calls the **existing** service;
- returns an explicit, customer-safe projection.

There is no second database and no duplicated business logic.

**Status:** built and tested locally (2026-11-11). **Not deployed.** The production release needs your approval.

## Files
| File | Role |
|---|---|
| `src/server/mobile/http.ts` | `mobile()` wrapper: auth, CORS for app origins only, cache rules, error mapping |
| `src/server/mobile/origins.ts` | App origins: `capacitor://localhost` (iOS), `https://localhost` (Android); `http://localhost:5174` outside production |
| `src/server/mobile/dto.ts` | Allow-listed projections (a field reaches the phone only if it is named) |
| `src/app/api/mobile/v1/**/route.ts` | 20 route handlers |
| `src/server/services/account.ts` | Profile settings, now shared by the website action and the app (one rule) |
| `src/server/auth/viewer.ts` | `viewerFromHeaders(h)`: the same lookup as `getViewer()`, usable outside page context |
| `src/app/api/auth/[...all]/route.ts` | Better Auth plus CORS for the app; exposes `set-auth-token` |

## Endpoints
| Method and path | Auth | Service reused | Cache |
|---|---|---|---|
| GET `/airports?q=` | – | `searchAirports` (max 8) | public 300 s |
| GET `/search?from&to&date&pax[&category][&returnDate]` | – | `searchCharter` | public 60 s |
| GET `/discover` | optional | `listLiveEmptyLegs`, `listPublishedListings`, `listCustomerRfqs` | public 120 s, private when signed in |
| GET `/requests` · POST `/requests` | ✓ | `listCustomerRfqs` · `createRfq` | no-store |
| GET `/requests/:ref` | ✓ owner | `getCustomerRfq` (no partner payout or fee) | no-store |
| POST `/requests/:ref/cancel` | ✓ owner | `cancelRfq` | – |
| POST `/offers/:id/accept` `{revision, confirm:true}` | ✓ owner | `acceptQuote` (revision lock, single booking per request) | – |
| POST `/offers/:id/decline` | ✓ owner | `declineQuote` | – |
| GET `/bookings/:ref` · POST `/bookings/:ref/cancel` | ✓ owner | `getCustomerBooking` · `cancelBooking` | no-store |
| GET `/one-way` · GET `/one-way/:id` | – | `listLiveEmptyLegs` · `getLiveEmptyLeg` | public 60–120 s |
| POST `/one-way/:id/enquire` | ✓ | `enquireEmptyLeg` | – |
| GET `/aircraft` · GET `/aircraft/:id` | – | `listPublishedListings` · `getPublishedListing` (no seller contact) | public 120 s |
| POST `/aircraft/:id/enquire` | ✓ | `submitBuyerEnquiry` (name and e-mail from the session) | – |
| GET `/notifications` · POST `/notifications/read-all` · POST `/notifications/:id/read` | ✓ owner | Notification rows | no-store |
| GET `/me` · PATCH `/me` | ✓ | `getProfile` · `saveSettings` | no-store |

## Envelope and errors
- **Success:** `{ "data": … }`.
- **Failure:** `{ "error": { "code", "message", "fieldErrors"? } }`.

| Code | HTTP |
|---|---|
| UNAUTHENTICATED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 (also returned for another customer's record, so existence is not revealed) |
| VALIDATION | 400, with `fieldErrors` keyed like `legs.0.to` |
| CONFLICT / INVALID_STATE | 409 (e.g. a stale offer revision, an already-accepted offer) |
| RATE_LIMITED | 429 |
| NOT_CONFIGURED | 503 |
| INTERNAL | 500, a generic message; logged server-side |

## Money, dates, labels
- **Money:** a decimal string plus an ISO currency (`"113400"`, `"INR"`). It is formatted on the phone in the device locale.
- **Leg dates and times:** the **departure airport's local** date (`YYYY-MM-DD`) and wall-clock `HH:MM`, plus the airport's IANA zone. Instants are ISO UTC.
- **Status:** `{ value, label, tone }`, using the website's customer copy (`statusInfo()`), so web and app always agree.

## Client rules (`mobile/src/api/client.ts`)
- **Auth:** a bearer token from the keystore, with `credentials: 'omit'`; cookies are never used.
- **Timeouts and cancellation:** a 15 s default timeout, plus `AbortController` cancellation on unmount or route change.
- **Retries:** **only idempotent GETs** are retried, once, after a dropped connection.
  - Submitting a request, accepting, declining and cancelling are **never** retried.
  - If the outcome is unknown, the user sees "We couldn't confirm…" with a link to check the current state.
- **Session loss:** a 401 clears the stored token and returns the user to signed-out.

## Tests
- **`tests/integration/mobile-api.test.ts`** (test database, real Better Auth bearer sessions), 7 tests:
  - CORS is granted to app origins only;
  - missing or forged tokens give 401;
  - public discovery and search work, and the same-airport search is refused;
  - request creation, plus isolation between customers;
  - acceptance needs explicit confirmation and the exact revision, a retry can't double-book, and no partner payout or fee leaks;
  - inbox and profile ownership;
  - sign-out revokes the session server-side.
- **`mobile/tests/app.test.ts`:**
  - the deep-link allowlist;
  - planner validation and the request body;
  - local-date formatting;
  - client retry and session-loss rules.

## Production rollout (needs approval)
1. **Merge and deploy** the backend changes (B1 bearer plugin plus trusted origins; B2 these routes). They are additive; the website's behaviour is unchanged, and all 116 website tests pass.
2. **Release builds:** they already point at `https://theprivate.in`; no app change is needed.
