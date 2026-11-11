# Mobile implementation checklist

Updated after every phase. Legend: ✅ done · 🔄 in progress · ⬜ not started · ⛔ blocked (the reason is given)

## Phase 1: Audit
- ✅ Re-ran the baseline: typecheck, 109/109 tests and the build all pass
- ✅ Environment inventory (Windows 11, JDK 21 JBR, SDK 36, emulator, no Mac, 13 GB free)
- ✅ [MOBILE_ARCHITECTURE.md](MOBILE_ARCHITECTURE.md): option B (Capacitor 8, a dedicated SPA, a thin mobile API)

## Phase 2: Product and UX
- ✅ [MOBILE_PRODUCT_SPEC.md](MOBILE_PRODUCT_SPEC.md): navigation, screens, data sources, route inventory, journeys

## Phase 3: Design system
- 🔄 MOBILE_DESIGN_SYSTEM.md: tokens are already shared with the website (enforced by test); the document is next

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

## Phase 5: Core app (+ backend B1, B2 locally)
- ⬜ B1: bearer plugin and trusted origins (local)
- ⬜ B2: `/api/mobile/v1/*` and CORS (local), with tests
- ⬜ API client: typed, validated, cancellation, timeouts, safe retries
- ⬜ Auth: sign in, sign up, verification return, sign out, session restore
- ⬜ Discover · Planner · Airport search · Results · Request
- ⬜ Journeys · Request detail and offer comparison · Accept and decline · Booking detail
- ⬜ Explore: one-way offers and aircraft for sale, with enquiries
- ⬜ Inbox · Profile and settings · Delete account (B4)

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
