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
- ✅ End-to-end in a phone viewport against the local backend (test database): browse → search → sign up → submit request TP-22RYY8 (7 partners contacted) → Journeys → Inbox → Profile, with **0 console or server errors**
- Fixed during testing:
  - Chromium's `scrollTo()` Promise crashed screen changes;
  - the draft wasn't loaded yet on a cold start;
  - a redirect after submission;
  - the absolute `callbackURL` was rejected.

## Phase 6: Native capabilities — 2026-11-11 ([MOBILE_NATIVE_FEATURES.md](MOBILE_NATIVE_FEATURES.md))
- ✅ Secure storage: Keychain (this device only, no iCloud sync) / Keystore; excluded from backups
- ✅ Biometric lock: opt-in with one successful scan; locks on a cold start and after 5 minutes away; passcode fallback; "Sign out instead"
- ✅ B4 account deletion: website Settings + app Profile; staff queue, e-mail confirmation, audit, idempotent (tested)
- ✅ B6 password reset: one-hour single-use link, signs out everywhere, never reveals whether an account exists; website pages plus an app sheet (tested)
- ✅ B3 push, backend:
  - `DevicePushToken` and the `PUSH` channel (additive migration, **local databases only**);
  - FCM HTTP v1 sender;
  - generic lock-screen text;
  - dead tokens revoked;
  - account switching (tested with simulated FCM).
- ✅ Push, app: permission asked at the point of use; token registration; tap → screen; unregistered on sign-out
  - ✅ **Android verified end to end with real Firebase** (project `theprivate-app`, apps registered by script): opt-in → OS dialog → registered → push SENT → generic text shown → tap opens the request
  - Fixed: a token was registered before permission was granted
  - ⛔ iOS push: an APNs key (Apple account) and a Mac to add `GoogleService-Info.plist` to the Xcode target
  - ⛔ Production push: `FCM_SERVICE_ACCOUNT` in Vercel (with the backend deployment approval)
- ✅ B5 app links: `.well-known` files from environment variables (404 until set); Android `autoVerify` filter; strict in-app allowlist
  - ⛔ The live test needs `APPLE_TEAM_ID` (plus iOS Associated Domains) and `ANDROID_CERT_SHA256`
- ✅ Share (public URLs only) · Network status · Android back · Haptics · Lifecycle (lock on resume)
- ⬜ Camera / document upload: not built. There is no customer document feature on the website; proposed as a later backend capability.
- ✅ Debug APK with all 12 native plugins (14.2 MB), built without Firebase files
- ✅ Browser walkthrough extended to deletion and password reset: 0 errors
- Fixed during testing: the Better Auth plugin order (`nextCookies()` must be last, which affects production cookie handling)

## Phase 7: Security and performance — 2026-11-11
- ✅ [MOBILE_SECURITY_REVIEW.md](MOBILE_SECURITY_REVIEW.md): secrets, sessions, API, device, data inventory
- ✅ The release build fails on secrets or development hosts; release CSP is production only; no source maps
- ✅ Release manifest audited: only the launcher activity is exported; minimal permissions
- ✅ Performance: start-up JS 414 → 375 KB (routes split); fonts trimmed to the subsets used, with the real italic added
- ✅ A friendly error screen instead of the router's developer page; iOS app-bound domains deferred until an iPhone test

## Phase 8: Test and refine — 2026-11-11 ([MOBILE_TEST_PLAN.md](MOBILE_TEST_PLAN.md), [MOBILE_TEST_REPORT.md](MOBILE_TEST_REPORT.md))
- ✅ Website 122/122 + 24/24 e2e; app 12/12; walkthrough with 0 errors; Android push verified on a device
- ✅ 12 defects found and fixed (listed in the report)
- ⛔ Real phones: none available

## Phase 9: Android release preparation
- ✅ Upload key generated (git-ignored; **back it up**); signed AAB and APK 0.1.0 (1), verified
- ✅ [GOOGLE_PLAY_SUBMISSION.md](GOOGLE_PLAY_SUBMISSION.md): listing, data safety, content rating, tracks
- ✅ `/delete-account` public page (Play requirement), website, local
- ⛔ Upload: needs a Play Console account and the backend deployed

## Phase 10: iOS release preparation
- ✅ Team ID set; [APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md): listing, privacy label, review notes, privacy addendum draft
- ✅ `mobile-release.yml` iOS job (macOS runner, API-key signing, TestFlight upload)
- ⛔ Paid membership, APNs key, App Store Connect API key, app record, Mac build

## Phase 11: Internal testing
- ✅ CI: `mobile.yml` (checks + debug APK artefact); `mobile-release.yml` (signed builds, manual)
- ⛔ Play internal testing / TestFlight: store accounts. Tester APK: works once the backend is deployed.

## Phase 12: Public release readiness
- ✅ Store screenshots (Play 1080×1920 ×6, iPhone 1290×2796 ×6), feature graphic, listing text, privacy answers
- ✅ [MOBILE_RELEASE_CHECKLIST.md](MOBILE_RELEASE_CHECKLIST.md), [MOBILE_ROADMAP.md](MOBILE_ROADMAP.md), [RELEASE_NOTES.md](RELEASE_NOTES.md)
- ⛔ Submission: your accounts and explicit approval

## Production changes awaiting approval
None deployed. B1–B6, the push migration, `/delete-account` and the `/api/files` 404 fix are all local; see MOBILE_RELEASE_CHECKLIST.md.
