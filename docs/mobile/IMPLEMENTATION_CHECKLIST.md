# Mobile implementation checklist

Updated after every phase. Legend: ✅ done · 🔄 in progress · ⬜ not started · ⛔ blocked (the reason is given)

## Phase 1: Audit
- ✅ Re-ran the baseline: typecheck, 109/109 tests and the build all pass
- ✅ Environment inventory (Windows 11, JDK 21 JBR, SDK 36, emulator, no Mac, 13 GB free)
- ✅ [MOBILE_ARCHITECTURE.md](MOBILE_ARCHITECTURE.md): option B (Capacitor 8, a dedicated SPA, a thin mobile API)

## Phase 2: Product and UX
- ✅ [MOBILE_PRODUCT_SPEC.md](MOBILE_PRODUCT_SPEC.md): navigation, screens, data sources, route inventory, journeys

## Phase 3: Design system
- ✅ [MOBILE_DESIGN_SYSTEM.md](MOBILE_DESIGN_SYSTEM.md): tokens shared with the website (enforced by test), type, layout, imagery, motion, components, accessibility

## Phase 4: Native foundation
- ✅ `mobile/` package (Vite 8, React 19.3, TS 6, React Router 7, Tailwind 4), isolated from the website build (root tsconfig excludes it)
- ✅ Capacitor 8.6 configuration; app id `in.theprivate.app` (**proposed**: awaiting your confirmation)
- ✅ Android project generated and hardened:
  - no backup;
  - HTTPS-only release;
  - debug-only cleartext to the emulator host;
  - signing placeholders.
- ✅ Debug APK built (7.9 MB) and launched on the emulator: night launch screen → Discover → all five tabs navigate
- ✅ iOS project generated (Swift Package Manager); building it needs a Mac
- ✅ App icon (rendered from the brand font), adaptive icon, splash, night system bars: 74 Android and 7 iOS assets
- ✅ Environment configuration: release builds are pinned to https://theprivate.in; development and preview by variable
- ✅ Shell: five-tab navigation, safe areas, a cinematic Discover hero using licensed photography, a design-token drift test
- ⚠️ Emulator: usable only with other apps closed (7.8 GB RAM; about 200 MB free during the session)

## Phase 5: Core app (+ backend B1, B2 locally) — 2026-11-11
- ✅ B1: Better Auth `bearer()` plugin and trusted app origins (local, **not deployed**)
- ✅ B2: 20 `/api/mobile/v1/*` handlers over existing services, app-only CORS, customer-safe projections ([MOBILE_API_INTEGRATION.md](MOBILE_API_INTEGRATION.md))
  - 7 integration tests with real bearer sessions; the full website suite is 116/116
- ✅ API client: typed, timeouts, cancellation, GET-only retry, no automatic retry of commercial actions, session-loss handling
- ✅ Auth: sign in, create account ("check your inbox" when verification is required), restore, sign out with server revocation; token in Keychain or Keystore ([MOBILE_AUTHENTICATION.md](MOBILE_AUTHENTICATION.md))
- ✅ Discover: live rails and next journey · Planner · Airport search sheet · Results (honest empty state) · Flight request (draft saved, sign-in keeps input)
- ✅ Journeys (grouped) · Request detail with offer comparison and a confirmation sheet for acceptance · Decline / cancel · Booking detail (local times, true payment state)
- ✅ Explore: one-way offers and aircraft for sale, details, enquiries, share (public URLs only)
- ✅ Inbox (web links mapped to app screens) · Profile (edit, sign out, partner workspace link) · Android back button · deep-link router
- ⬜ B4 account deletion endpoint: the app currently routes the request to the contact page (stated plainly)
- ✅ End-to-end in a phone viewport against the local backend (test database): browse → search → sign up → submit request TP-22RYY8 (7 partners contacted) → Journeys → Inbox → Profile, with **0 console or server errors**
- Fixed during testing:
  - Chromium's `scrollTo()` Promise crashed screen changes;
  - the draft wasn't loaded yet on a cold start;
  - a redirect after submission;
  - the absolute `callbackURL` was rejected.

## Phase 6: Native capabilities
- ⬜ Secure storage (Keychain / Keystore)
- ⬜ Biometric lock
- ⛔ Push: B3 is built locally; the end-to-end test needs a Firebase project and APNs key
- ⛔ Universal Links / App Links: B5 needs the Apple Team ID and the Play signing SHA-256
- ⬜ Document and camera upload · Share · Network status · Lifecycle

## Phase 7: Security and performance
- ⬜ MOBILE_SECURITY_REVIEW.md · bundle secret scan · backup exclusion · motion tiers

## Phase 8: Testing
- ⬜ Unit tests (API client, auth, planner validation, deep-link router)
- ⬜ Mobile API integration tests (test database)
- ⬜ Emulator end-to-end journeys
- ⛔ Real devices: none connected

## Phases 9–12: Release
- ⛔ Signed AAB: needs a Play Console account and keystore approval
- ⛔ Signed IPA: needs an Apple Developer account and a Mac or CI
- ⛔ TestFlight / Play internal testing
- ⬜ Store listings, privacy declarations, review notes (drafts)

## Production changes awaiting approval
None deployed. B1–B6 are listed in MOBILE_ARCHITECTURE.md §14.
