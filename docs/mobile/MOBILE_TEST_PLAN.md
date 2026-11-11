# Mobile test plan

## Layers
| Layer | What | Where | Runs in CI |
|---|---|---|---|
| App unit tests | Deep-link allowlist, planner validation, request body, date and money formatting, API client (bearer, no cookies, GET-only retry, never retry commercial actions, session loss), design-token parity, release pinning | `mobile/tests/*.test.ts` (Vitest) | ✅ `mobile.yml` |
| Release bundle scan | Fails the build on private keys, Razorpay, Stripe or Google keys, database URLs, or development hosts | `vite.config.ts` | ✅ |
| Mobile API integration | Real Better Auth bearer sessions on the test database: CORS, auth, isolation, request creation, offer acceptance, inbox, profile, sign-out, password reset, deletion, push registration and sending (simulated FCM) | `tests/integration/mobile-api.test.ts` | Website suite |
| Website regression | All existing website tests, plus 24 Playwright journeys | `tests/`, `tests/e2e` | Website suite |
| App walkthrough | Browse → plan → airport search → results → sign up → request → journeys → explore → profile → inbox → delete account → forgotten password, with 0 console or server errors | `mobile/e2e/walkthrough.mjs` (phone viewport, local backend) | Manual |
| Device tests (Android) | Install, launch, splash and status bar, tab navigation, push opt-in → OS dialog → registration → real FCM delivery → tap opens the request | Emulator (API 36, Play services) through Playwright's Android mode | Manual |
| Device tests (iOS) | Same as Android, plus Face ID, Keychain and Universal Links | **Pending:** Mac / TestFlight | — |
| Store artefacts | Signed AAB/APK verified (`apksigner`, `jarsigner`, `aapt2`) | `mobile-release.yml` | Manual dispatch |

## Release-candidate journeys (run on a real device before each release)
1. **Fresh install:** the night splash appears, then Discover; there's no white flash and the safe areas are correct.
2. **Guest:** Discover → Plan → BOM → DXB → date → 4 passengers → results (or the honest empty state).
3. **Sign up:** verification e-mail (production) → confirm → sign in → the request draft is kept.
4. **Request:** submit, then the reference is shown; "Get notified" → allow; then Journeys.
5. **Offer:** a partner sends an offer → a push with generic text → tap → request detail → compare → the accept sheet shows the price and conditions → confirm → the booking says "Awaiting confirmation".
6. **Booking:** local times with the zone shown; the payment state matches the server.
7. **Explore:** one-way offers and aircraft; enquire; share opens the public URL.
8. **Profile:** edit details; turn the app lock on, background the app for more than 5 minutes, then unlock; sign out (the push token is removed).
9. **Recovery:** forgotten password → e-mail → reset on the website → sign in.
10. **Deletion:** Profile → Delete account → confirm → signed out → confirmation e-mail.
11. **Offline:** aeroplane mode shows the banner; the draft is kept; submit is disabled; reconnect and submit once (no duplicate).
12. **Session expiry:** revoke the session server-side; the next action signs the user out cleanly.

## Devices
| Device | Status |
|---|---|
| Android emulator API 36.1 (Play Store image) | ✅ Used |
| Android mid-range phone | ⛔ Not available |
| Android high-end phone | ⛔ Not available |
| Recent iPhone | ⛔ Needs paid membership + TestFlight |
| Older or mid-range iPhone | ⛔ Same |
