# Mobile release checklist

✅ done · ⬜ to do · ⛔ blocked on an input from you

## Backend (production): deployed 2026-11-11
- ✅ Migration `20261111081753_mobile_push_devices` applied to Neon (by you)
- ✅ Deployed `11510f1` to theprivate.in: the mobile API, password reset, `/delete-account`, the app-link routes and the `/api/files` 404 fix
- ✅ Smoke test:
  - public endpoints 200; private 401 without a session;
  - CORS allows only the app origin;
  - `.well-known` 404 until configured (intended).
- ✅ **The signed release APK against production on the emulator:** live airport search, sign-in with the demo account, Profile loads live
- ✅ Store-review demo account `app-review@theprivate.in` (password in your local `.env` as `DEMO_REVIEW_PASSWORD`; customer only, no staff role)
- ⬜ **`FCM_SERVICE_ACCOUNT` in Vercel (production):** blocked for me by the permission system; **you add it** (steps in the final report). Until then, live push deliveries are recorded as "not configured".
- ⬜ **Queue pace:** push and e-mail deliveries run through the job queue. Vercel's daily cron alone means up to a day's delay. Add GitHub secrets `APP_URL` and `CRON_SECRET` to switch on the 5-minute worker.
- ⬜ Later:
  - `APPLE_TEAM_ID=3J5MTMY4J8` (once the Apple membership is paid);
  - `ANDROID_CERT_SHA256` (after the first Play upload).

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
