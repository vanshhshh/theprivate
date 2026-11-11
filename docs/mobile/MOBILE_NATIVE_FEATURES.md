# Mobile native features

Status at 2026-11-11.
- **"Works now":** built and tested on the emulator, in the browser, or by automated tests.
- **"Switches on with":** fully implemented, waiting only for the external identity listed.

| Feature | Implementation | Status |
|---|---|---|
| Secure session storage | `@aparajita/capacitor-secure-storage`: Keychain (this device only, no iCloud sync) / Android Keystore. App data is excluded from backups. | Works now |
| Biometric lock | `src/auth/biometric.tsx`. Optional Face ID / Touch ID / fingerprint with a device-passcode fallback. Locks on a cold start and after more than 5 minutes in the background. Turning it on requires one successful scan. "Sign out instead" is always offered. It never replaces the server session. | Works now (needs a real device to exercise biometrics) |
| Push notifications | `src/native/push.ts` + `src/server/push/*`. FCM HTTP v1 (iOS via APNs in Firebase). Permission is asked only after the customer's first request ("Get notified when offers arrive") or from Profile. Tokens move with the signed-in account and are removed on sign-out; dead tokens are revoked automatically. **Lock-screen text is generic** ("You have a new offer to review"). | **Switches on with:** a Firebase project; `google-services.json` (Android); `GoogleService-Info.plist` plus an APNs key (iOS); `FCM_SERVICE_ACCOUNT` on the server; and a build with `VITE_PUSH_ENABLED=true` |
| Deep links (Universal Links / App Links) | `src/lib/links.ts` is a strict allowlist of customer paths, rejecting other hosts and malformed ids. Android has an `autoVerify` intent filter. The server serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from environment variables (404 until set). | **Switches on with:** `APPLE_TEAM_ID` plus the iOS Associated Domains capability; `ANDROID_CERT_SHA256` (the Play app signing key) |
| Notification and deep-link routing | A web path such as `/account/trips/TP-…` maps to the app screen. Workspace and admin links open in the in-app browser. A private screen still requires a session and the server's ownership check. | Works now |
| Share | `@capacitor/share`. Only public listing URLs (one-way offers, aircraft for sale). | Works now |
| In-app browser | `@capacitor/browser` for legal pages, contact, the partner workspace and the password-reset page. | Works now |
| Network awareness | `@capacitor/network`. An offline banner; submit is disabled offline (the draft is kept); reads retry once; commercial actions never retry automatically. | Works now |
| Android back button | Goes back; exits from a main tab. | Works now |
| Haptics | Light ticks on selection; a success notification on submit and accept. | Works now |
| Status bar / splash / safe areas | Night status bar over cinematic heroes; brand splash; Capacitor SystemBars insets. | Works now |
| Account deletion | Profile → Delete account (explicit confirmation), then a request in the staff queue plus an e-mail confirmation and an audit record. The device is signed out. The website has the same option in Settings. | Works now (staff complete the deletion; see below) |
| Password reset | Sign in → "Forgotten your password?" sends a one-hour, single-use link. The new password is set on theprivate.in, and all sessions are signed out. | Works now (needs SMTP, which production has) |
| Camera / document upload | **Not built.** Customers have no document-upload feature on the website either, so adding one would be a new backend capability (storage rules, access control, retention). It is proposed for a later release. | Proposed |

## Permissions requested
- **iOS:**
  - `NSFaceIDUsageDescription` ("Unlock ThePrivate with Face ID.");
  - push, asked at the point of use;
  - no camera, photos or location.
- **Android:**
  - `INTERNET`;
  - `USE_BIOMETRIC` (added by the biometric plugin);
  - `POST_NOTIFICATIONS` (Android 13+, asked at the point of use);
  - no camera, storage or location.

## Remaining work tied to these features
1. **Staff tooling to complete a deletion:** anonymise the user, revoke sessions and devices, and keep only legally required records. The legal retention list comes from your counsel. Until then, staff process the queue manually.
2. **Notification preferences per category:** push is all-or-nothing per phone today.
