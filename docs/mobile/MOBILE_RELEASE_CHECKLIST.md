# Mobile release checklist

✅ done · ⬜ to do · ⛔ blocked on an input from you

## Backend (production): needs your approval
- ⬜ Apply migration `20261111081753_mobile_push_devices` to Neon. It is additive: one table, one enum value.
- ⬜ Push the local commits to `main`. That deploys B1–B6, the mobile API, password reset, the deletion page and the app-link routes.
- ⬜ Vercel variables:
  - `FCM_SERVICE_ACCOUNT` (from a **rotated** key);
  - `APPLE_TEAM_ID=3J5MTMY4J8` (only once the paid membership exists);
  - `ANDROID_CERT_SHA256` (after the first Play upload).
- ⬜ A smoke test against production: `/api/mobile/v1/discover` 200, sign-in from the app, a request, a push.
- ⬜ Create the store-review demo account on production.

## Security
- ⬜ Rotate the Firebase service-account key (it was shared in chat).
- ⬜ Back up the Android upload key and `keystore.properties` to a password manager.
- ⬜ Add a per-token rate limit on `/api/mobile/v1/*`.
- ⬜ Have counsel review the privacy-policy addendum (`APP_STORE_SUBMISSION.md`).
- ✅ Bundle secret scan · HTTPS-only release · no backups of the session · minimal permissions · generic push text

## Android
- ✅ Signed AAB/APK 0.1.0 (1) · targetSdk 36 · Firebase push verified end to end
- ⛔ Play Console account (US$25 one-time) → internal testing → closed test (12 testers × 14 days for new personal accounts) → production
- ⬜ Test on 2 real Android phones (mid-range and high-end)

## iOS
- ✅ Project, icons, splash, Face ID text, Team ID, CI workflow (`mobile-release.yml`)
- ⛔ Paid Apple Developer Program → APNs key (uploaded to Firebase) → App Store Connect API key → app record
- ⛔ A Mac or GitHub macOS runner build → TestFlight → test on 2 iPhones
- ⬜ App-bound domains and Universal Links verified on an iPhone

## Store content
- ✅ Listing text, privacy/data-safety answers, review notes, feature graphic, screenshots (Play 1080×1920; iPhone 1290×2796)
- ⬜ Your support e-mail address
- ⬜ Demo account credentials (production)
- ⬜ Your go-ahead to submit (each store separately)

## Versioning
- Marketing version: `mobile/package.json` (`0.1.0`), shared by both platforms.
- Build number: the `version_code` input in `mobile-release.yml`. It must increase with every upload, on both stores.
- Release notes: keep them in `docs/mobile/RELEASE_NOTES.md`, one section per version.
