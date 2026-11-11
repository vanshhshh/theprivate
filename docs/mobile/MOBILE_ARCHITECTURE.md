# ThePrivate mobile: architecture audit and decision

Phase 1 deliverable. Audited on 2026-11-11 against commit `c4e663c`. Nothing in production was changed to produce it.

## 1. Baseline (re-run before any mobile work)

| Check | Result |
|---|---|
| TypeScript | ✓ clean |
| Vitest (unit + integration) | ✓ 109 / 109 |
| Production build (`next build`) | ✓ 48 pages generated |
| Playwright e2e | 24 / 24 on 2026-11-10 (not re-run; it rebuilds the test database) |

## 2. The existing platform (findings)

### Next.js application
- **Framework:** Next.js 16.4 App Router, React 19.3, Tailwind v4, deployed on Vercel. `next.config.ts` has no `output: 'export'`, so it is a server application.
- **Rendering:** about 75 routes, nearly all **Server Components** that query Prisma directly, for example the charter results page calls `searchCharter()` and reads airports in the page itself. Only 19 files are Client Components.
- **Mutations:** these go through **9 Server Action modules** (`'use server'`), for example `createRfqAction`, `acceptQuoteAction`, `cancelBookingAction`, `saveSettingsAction`, `markAllReadAction`. Server Actions are bound to the Next.js runtime and its encrypted action IDs; **they cannot be called from a separate app**.
- **JSON APIs:** only 7, and none of them is a general-purpose API:
  - `/api/airports?q=` (public airport search, cacheable);
  - `/api/auth/[...all]` (Better Auth);
  - `/api/files/[id]` (authorised file delivery);
  - `/api/cron/worker`;
  - `/api/unsubscribe`;
  - two payment webhooks.
- **There is no middleware/proxy.** Authorisation is enforced in the services, through `getViewer()`, `requireViewer()` and per-record ownership checks.
- **The security headers include a strict CSP** (`connect-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`). The site therefore **cannot be framed**, and its APIs have **no CORS**.

### Business logic is already well separated
The domain lives in `src/server/services/*` and `src/domain/*`, not in the pages:

| Capability | Existing service functions |
|---|---|
| Airports | `searchAirports`, `getAirports` |
| Charter search | `searchCharter` (verified supply only, labelled availability, indicative ranges only when the rate, the sourced cruise speed **and** a signed agreement exist) |
| Requests (RFQ) | `createRfq`, `listCustomerRfqs`, `getCustomerRfq` (a customer-safe projection that never exposes operator payout or the platform fee), `cancelRfq` |
| Offers | `acceptQuote(viewer, quoteId, expectedRevision)` (optimistic locking), `declineQuote` |
| Bookings | `getCustomerBooking`, `cancelBooking` (`PAID` is set **only** by a verified webhook or an audited offline settlement) |
| One-way offers | `listLiveEmptyLegs`, `getLiveEmptyLeg`, `enquireEmptyLeg` |
| Aircraft for sale | `listPublishedListings`, `getPublishedListing`, `submitBuyerEnquiry` (seller contact details are never returned), `myListings` |
| Notifications | `notify()` writes `Notification` rows (title, body, link) plus `NotificationDelivery` rows per channel (EMAIL, SMS, WHATSAPP) |

This is what makes a mobile app possible **without a second source of truth**: the app needs a thin transport layer over these functions, not new logic.

### Authentication
- **Library:** Better Auth 1.7, with e-mail and password plus e-mail verification (enforced in production since 2026-11-10).
- **Sessions:** cookie sessions in the `Session` table, with a 14-day expiry and daily refresh.
- **Resolution:** `getViewer()` resolves the session from request headers with `auth.api.getSession({ headers })`.
- **Bearer tokens:** the installed Better Auth includes the official **`bearer` plugin**. It turns `Authorization: Bearer <session token>` into the same session, so **every existing service and ownership check works unchanged for mobile requests**.

### Media and visual system
- **Imagery:** licensed photography, pre-sized WebP plates in `public/media/{film,scenes}` (3.5 MB in total, with credits).
- **Opening film:** a GSAP scroll-driven sequence (`flight-film.tsx`).
- **Design tokens:** the Tailwind `@theme` in `globals.css`:
  - paper and ink;
  - night, dusk and haze;
  - magenta accent;
  - status colours for verified, indicative and unconfirmed;
  - Newsreader (display), Instrument Sans (UI), IBM Plex Mono (data);
  - the easing curves `climb` and `approach`.

## 3. The development computer

| Item | Found | Consequence |
|---|---|---|
| OS | Windows 11 (10.0.26200) | iOS cannot be compiled or signed here |
| Node / npm | 24.20 / 11.19 | ✓ Capacitor 8 needs Node ≥ 22 |
| JDK | JDK 23 on PATH; **JDK 21** bundled with Android Studio (`jbr`) | Capacitor 8 / AGP 8.13 compile with Java 21. Use the bundled JBR (`JAVA_HOME`) |
| Android Studio | 2025.2 (AI-252) | ✓ |
| Android SDK | platforms 34/35/36, build-tools 35/36.1, NDK 28, emulator, platform-tools | ✓ Capacitor 8 targets compileSdk/targetSdk **36**, minSdk 24 |
| Emulator | AVD `Medium_Phone_API_36.1` | ✓ Android testing possible |
| Physical devices | none connected (`adb devices` is empty) | Real-device testing is pending; documented as a limitation |
| Gradle | wrapper caches 8.9–9.3 present | ✓ |
| Xcode / CocoaPods | not available | The iOS project can be **generated and maintained**; building, simulator testing and signing need a Mac or cloud Mac |
| **Free disk on C:** | **≈ 13 GB of 424 GB (98 % full)** | **Risk.** One Gradle build and its caches need 3–6 GB; emulator images need more. Free space before heavy Android work. |

## 4. Options evaluated

### Option A: Capacitor pointed at the live site (`server.url = https://theprivate.in`)
- **Reuse:** maximum; every page works on day one.
- **Against:**
  - It is a website wrapper. Apple guideline **4.2 (minimum functionality)** routinely rejects it.
  - It offers no offline shell, and you get a blank screen when the connection drops.
  - Native navigation is impossible because every screen is a web page.
  - Push, secure storage and biometrics would have to bridge into remote pages; Capacitor plugins on remote origins are a security and maintenance problem.
  - The desktop-first layouts and the scroll-driven film are not a phone product.
  - The CSP would need loosening.
- **Verdict:** rejected as the app architecture. It remains acceptable for one narrow use: opening a web-only flow (company onboarding) in an in-app browser.

### Option B: Capacitor with a dedicated mobile app, shared domain, thin mobile API  ← **chosen**
- **App:** a separate, bundled SPA (Vite + React 19 + TypeScript) in `mobile/`, shipped inside Capacitor 8 for iOS and Android.
- **Shell:** it renders the app shell, navigation and cached public content **locally**, so the app opens instantly, works offline for what it safely can, and feels native.
- **Data:** it talks to the **existing production backend** through a small, versioned JSON layer, `/api/mobile/v1/*`, added to the existing Next.js app. Each route handler is a few lines:
  - validate the input with the **existing zod schemas**;
  - call the **existing service function**;
  - return a typed, customer-safe projection.
- **Code reuse:**
  - the design tokens and imagery;
  - the pure domain modules (`src/domain/*`: status copy, formatting, journey rules) and the zod schemas;
  - the same services, through the API layer.
- **What isn't reused:** the server-component page code, which must be re-expressed as mobile screens. That is the point of building a phone product instead of shrinking the website.

### Option C: Expo / React Native
- **For:** truly native rendering and the best possible scroll and gesture performance.
- **Against:**
  - None of the existing React DOM components, Tailwind styling or web media pipeline carry over.
  - It needs a second UI stack for the team to maintain.
  - Push, deep links and secure storage are equally available in Capacitor.
  - Since the backend work (the mobile API and bearer auth) is identical for B and C, C only adds cost.
- **Verdict:** not justified. Reconsider only if Phase 8 measurements on real mid-range devices show the WebView cannot hold the motion standard.

### Why B
- **Same backend:** one source of truth and the existing business rules. The only backend additions are transport (route handlers), bearer auth and push-token storage.
- **Reuse:** the TypeScript, React and design-system skills of the existing codebase.
- **Store review:** a bundled, purpose-built app with native navigation, push, biometrics, sharing, deep links and offline handling clears guideline 4.2.
- **Cost:** one UI codebase for both platforms.

## 5. Target architecture

```
┌──────────── iOS / Android (Capacitor 8 native shell) ────────────┐
│  WKWebView / Android WebView running the bundled mobile SPA     │
│  mobile/ (Vite, React 19, TS, React Router)                     │
│   ├─ screens: Discover · Plan · Journeys · Explore · Profile    │
│   ├─ api/   typed client (fetch, zod-validated responses)       │
│   ├─ auth/  token in Keychain / Keystore, biometric gate        │
│   └─ native/ push, deep links, share, camera, network, haptics  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS · Authorization: Bearer <session>
┌───────────────────────────────▼─────────────────────────────────┐
│  Existing Next.js app on Vercel (theprivate.in)                 │
│   /api/mobile/v1/*  ← NEW thin route handlers (no new logic)    │
│   /api/auth/*       ← Better Auth + bearer plugin (NEW plugin)  │
│   src/server/services/*  ← unchanged business logic             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                        Neon PostgreSQL (single source of truth)
```

## 6. Authentication strategy
- **Sign-in and sign-up:** the app calls the existing Better Auth endpoints (`/api/auth/sign-in/email`, `/sign-up/email`). The **bearer plugin** returns the session token in a `set-auth-token` response header.
- **Storage:** the token goes into **Keychain** (iOS) or the **Android Keystore**-backed encrypted store, through `@aparajita/capacitor-secure-storage`. It is never kept in `localStorage` or Preferences.
- **Requests:** every request sends `Authorization: Bearer <token>`. Server-side, `getViewer()` resolves the same `Session` row as the website, so the session lifetime, revocation, disabled accounts and roles behave identically. **There is no parallel auth system.**
- **Verification and recovery:**
  - E-mail verification is unchanged: the link opens `theprivate.in`, and with App Links / Universal Links it returns to the app.
  - Password reset uses the existing Better Auth flow; the reset e-mail is needed (see risks).
- **Biometrics:** Face ID, Touch ID or Android BiometricPrompt only **unlocks the locally stored session** after the app has been in the background. It never replaces the server session.
- **Sign-out:** revokes the session server-side (`/api/auth/sign-out`), deletes the token from secure storage, and unregisters the device push token.

## 7. API communication strategy
- **Route handlers:** `/api/mobile/v1/*` live in the Next.js app, and each one calls an existing service.
- **Inventory:** the list is in [MOBILE_API_INTEGRATION.md](MOBILE_API_INTEGRATION.md) (Phase 5). The first set covers:
  - airports;
  - search;
  - creating an RFQ and listing and reading RFQs;
  - accepting and declining a quote;
  - cancelling an RFQ or booking;
  - bookings;
  - one-way offers (list, read, enquire);
  - aircraft for sale (list, read, enquire, my enquiries);
  - notifications (list, read, mark all read);
  - profile and settings;
  - registering and removing a device;
  - requesting account deletion.
- **CORS:** allowed only on `/api/mobile/*` and `/api/auth/*`, and only for the app origins `capacitor://localhost` (iOS) and `https://localhost` (Android). Credentials are bearer tokens, never cookies, so CSRF does not apply. The website CSP is untouched.
- **Client:**
  - typed requests and responses;
  - zod validation of responses;
  - `AbortController` cancellation;
  - timeouts;
  - retries **only for idempotent GETs**;
  - safe error messages;
  - pagination where the services paginate.
- **Commercial actions:** accepting a quote or cancelling are **never auto-retried**. Quote acceptance sends the `expectedRevision` the customer saw; the server already rejects stale revisions. RFQ creation carries a client-generated idempotency key, so a reconnect cannot create a duplicate request.

## 8. Native integration strategy

| Capability | Plugin | Notes |
|---|---|---|
| Secure storage | `@aparajita/capacitor-secure-storage` 8 | Keychain / Keystore |
| Biometrics | `@aparajita/capacitor-biometric-auth` 10 | Optional app lock |
| Push | `@capacitor-firebase/messaging` 8 (FCM on both platforms; APNs via Firebase) | One sender service on the server; tokens stored per device |
| Deep links | `@capacitor/app` (`appUrlOpen`) plus Universal Links / App Links | Needs `apple-app-site-association` and `assetlinks.json` on theprivate.in |
| Share | `@capacitor/share` | Public URLs only |
| Camera / files | `@capacitor/camera`, the file input | Permissions only when invoked |
| Network | `@capacitor/network` | Offline banner, safe retries |
| Shell | `@capacitor/splash-screen`, `status-bar`, `keyboard`, `haptics` | |
| In-app browser | `@capacitor/browser` | Web-only flows such as company onboarding and legal pages |

## 9. Push architecture
- **Data:** a new `DevicePushToken` table and a new `PUSH` value on `DeliveryChannel` (an additive migration):
  - user, token, platform;
  - app version, last seen, revoked.
- **Hook:** `notify()` already writes per-channel `NotificationDelivery` rows. A `PUSH` delivery is queued for each active device of the recipient, and the existing job worker sends it through the **FCM HTTP v1 API**. A service-account credential is held only on the server.
- **Payload:**
  - a generic title ("Your journey has an update");
  - the notification **id** plus an in-app path;
  - **no itinerary, passenger or price data on the lock screen**.
  
  The app fetches the details after it opens and the user authenticates.
- **Dedupe and opt-out:** one delivery per notification per device, with `dedupeKey`. Tokens rejected by FCM (`UNREGISTERED`) are revoked automatically. Push respects the user's notification preferences.

## 10. Deep links
- **Domain:** `https://theprivate.in` hosts:
  - `/.well-known/apple-app-site-association` (needs the **Apple Team ID**);
  - `/.well-known/assetlinks.json` (needs the **SHA-256 of the Play app signing key**).
- **Paths handled in the app:**
  - `/charter`;
  - `/empty-legs` and `/empty-legs/:id`;
  - `/aircraft-for-sale` and `/aircraft-for-sale/:id`;
  - `/account/trips/:ref`;
  - `/account/bookings/:ref`;
  - `/account/notifications`;
  - `/sign-in`, the verification return, and `/claim/:token` (handed to the in-app browser).
  
  Everything else opens in the browser.
- **Validation:** a strict router allowlist; ids are validated by shape. Private routes require a session first and then a server-side ownership check, which the services already do. When the app isn't installed, the same URL simply opens the website.

## 11. Offline strategy
- **Cache:** the app shell and imagery are bundled. **Public, non-commercial** data (airport search results, published listings and one-way offers) is cached with a timestamp and shown as "last updated".
- **Never served from cache as current:** prices, availability, offers, booking state and anything private. These are shown only from a live response.
- **Forms:** a flight-request draft is persisted locally, without contact details, until it is submitted.

## 12. Security model (summary)
- **Credentials:** no secrets in the bundle. Only public configuration (the API base URL, the Firebase client config) goes in. The Razorpay secret, database URLs and SMTP credentials stay on the server.
- **Tokens:** stored in Keychain or Keystore, and excluded from iCloud and Android backups (`allowBackup=false`, `dataExtractionRules`).
- **Server authority:** every permission and commercial rule stays server-side; the app is a client like the website.
- **Data hygiene:** no sensitive data in logs, analytics, crash reports or push payloads.
- **Network:** HTTPS only (ATS defaults; Android `usesCleartextTraffic=false` outside debug).

The full review is in [MOBILE_SECURITY_REVIEW.md](MOBILE_SECURITY_REVIEW.md) (Phase 7).

## 13. Build and release architecture
- **Layout:** `mobile/` is an independent npm package. The root `tsconfig` and the Next build exclude it, so **website builds and deployments are unaffected**. `mobile/android` and `mobile/ios` are committed native projects; signing material never is.
- **Android:** built locally on this PC (Gradle, JDK 21). It also builds in GitHub Actions (ubuntu), with the keystore supplied as an encrypted secret.
- **iOS:** the project is generated here. It is compiled and signed on GitHub Actions `macos` runners or a cloud Mac, once the Apple account exists.
- **Environments:** `development` (local backend), `preview` (a Vercel preview URL) and `production` (theprivate.in), selected at build time. Debug builds can never point at production by accident, and release builds can never point at development.

## 14. Backend changes required (need your approval before production)

| # | Change | Why | Size |
|---|---|---|---|
| B1 | Enable the Better Auth `bearer()` plugin, and add the app origins to `trustedOrigins` | Token auth for the app, using the same sessions | ~5 lines |
| B2 | `/api/mobile/v1/*` route handlers, plus CORS for the app origins on those paths only | The app cannot call Server Actions | ~20 small files, no new business logic |
| B3 | `DevicePushToken` model and the `PUSH` delivery channel (additive migration), plus an FCM sender in the worker | Push notifications | 1 migration, 1 service |
| B4 | An account-deletion request: an endpoint plus a staff queue, and a link on the website | **Required by both stores** | Small; uses the existing audit trail |
| B5 | Serve `apple-app-site-association` and `assetlinks.json` | Universal Links / App Links | 2 static files; needs your IDs |
| B6 | A password-reset e-mail through the existing mailer | The app and site need account recovery (none exists today) | Small |

**All of these are built and tested locally first. Nothing is deployed until you approve.**

## 15. Known risks

1. **Disk space (13 GB free):** this can stall Android builds and the emulator. Free at least 20 GB.
2. **There is no Mac.** iOS builds and signing depend on a cloud Mac or CI runner once the Apple account exists.
3. **Apple review of the service model.** ThePrivate brokers flights that third parties operate.
   - Under guideline 3.1.3(e) and 3.1.5, physical services may use external payment; charter payments are physical services.
   - Listing copy and the review notes must state clearly that operators provide the flights.
   - The organisation account must match the legal entity.
4. **Push needs a Firebase project and an APNs key.** It cannot be tested end to end until both exist.
5. **No real devices are connected.** Real-device testing is pending.
6. **Account recovery:** there is no password-reset flow today (B6).
7. **WebView performance of cinematic motion on low-end Android:** this is mitigated by a reduced-motion tier and stills-first media, and will be measured in Phase 8.
8. **Supply is currently thin.** The app must look deliberate when results are empty; the website already treats empty states honestly.

## 16. Milestones (estimates; they depend on your inputs)

| Phase | Output | Estimate |
|---|---|---|
| 1–3 | Audit, product spec, design system | done / in progress |
| 4 | Native foundation: projects, identity, a debug APK on the emulator | 1 day |
| 5 | Core screens, plus mobile API B1–B2 (local backend) | 5–8 days |
| 6 | Native capabilities: secure storage, biometrics, push (B3), deep links (B5), upload, share | 3–5 days |
| 7–8 | Security, performance, automated and emulator testing, fixes | 3–4 days |
| 9 | Signed AAB (needs a Play account and keystore approval) | 0.5 day after the account |
| 10 | Signed IPA (needs the Apple account plus a Mac or CI) | 1–2 days after the account |
| 11–12 | Internal testing, store packages, release approval | Depends on review |

## 17. Inputs needed from you

1. **Free disk space on C:** (≥ 20 GB).
2. **Legal entity details** for the store accounts:
   - the company's registered name;
   - a D-U-N-S number;
   - the authorised signatory;
   - a business address, which is also needed for the e-mail footer.
3. **Apple Developer Program enrolment** (organisation): needed for the Team ID, signing, APNs and TestFlight.
4. **Google Play Console** (organisation): needed for the app ID registration and the Play app signing SHA-256.
5. **A Firebase project** for push (I can prepare the configuration once you create it and add me, or share the config files).
6. **The final app identifier.** I'm proposing `in.theprivate.app` (reverse of the domain you own), instead of `com.theprivate.app`, whose domain you don't appear to own.
7. **Approval of backend changes B1–B6** for production, once they're built and tested locally.
8. **Access to a real iPhone and Android phone,** or permission to use a device cloud, for real-device testing.
9. **Support e-mail and URL** for the store listings.
