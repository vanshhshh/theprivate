# Mobile security review

Phase 7, 2026-11-11. Scope:
- the Capacitor app (`mobile/`);
- the mobile API (`/api/mobile/v1`);
- the auth changes (bearer plugin, password reset);
- push;
- app links;
- release build settings.

Each finding below was checked against code or a build artefact, not assumed.

## Secrets and configuration
| Check | Result | Evidence |
|---|---|---|
| No secrets in the app bundle | ✅ The release build **fails** if the bundle contains a private key, a Razorpay key, a database URL with a password, a Stripe secret, a Google API key or a development host | `vite.config.ts` `releaseHardening` |
| Only public configuration shipped | ✅ The API base URL (pinned to `https://theprivate.in` in release builds) and the Firebase client config (public by design) | `src/config/env.ts`, `google-services.json` |
| Signing material, Firebase files and service accounts kept out of git | ✅ Git-ignored: `mobile/signing/`, `*.jks`, `*.p8`, `*.p12`, `keystore.properties`, `google-services.json`, `GoogleService-Info.plist` | `mobile/.gitignore`. The staged files are checked before each commit. |
| Release JavaScript has no source maps | ✅ `sourcemap: false`; 0 `.map` files in `dist` | build output |
| Server secrets (FCM service account, Razorpay, SMTP, database) | ✅ Server-only environment variables | `MOBILE_ENVIRONMENT_VARIABLES.md` |
| **The Firebase service-account key was shared in chat** | ⚠️ **Rotate it:** Firebase → Service accounts → generate a new key, delete the old one | — |

## Authentication and sessions
| Check | Result |
|---|---|
| One identity system | ✅ Better Auth sessions are shared with the website. The bearer token is a session token; there is no parallel token store. |
| Token storage | ✅ Keychain (`whenUnlockedThisDeviceOnly`, iCloud sync off) / Android Keystore. Never in `localStorage` or Preferences. |
| Backups | ✅ Android `allowBackup=false`, and `dataExtractionRules` exclude everything from cloud backup and device transfer |
| Sign-out | ✅ Revokes the server session (tested), deletes the local token and unregisters the push token |
| Forged, expired or revoked tokens | ✅ 401, the token is cleared and the user signed out (tested) |
| Password reset | ✅ A one-hour single-use link that signs out everywhere, and no account enumeration (tested) |
| Biometric lock | ✅ Only gates the local session; it never replaces server authentication. Opt-in requires a successful scan. |
| Better Auth plugin order | ✅ Fixed: `nextCookies()` last, otherwise website cookies set by other plugins could be dropped |

## API surface (`/api/mobile/v1`)
| Check | Result |
|---|---|
| CORS | ✅ Only `capacitor://localhost` and `https://localhost` (and the Vite dev host outside production). Credentials are bearer tokens, never cookies, so there is no CSRF exposure. |
| Authorisation | ✅ Every private route requires a session. Ownership is enforced by the existing services; another customer's record returns 404 (tested). |
| Field exposure | ✅ Allow-listed DTOs. Tests assert that operator payout and platform fee never appear, and that seller contact details are never returned. |
| Commercial integrity | ✅ Acceptance requires `confirm:true` and the exact revision; a retry cannot double-book (tested). The client never auto-retries commercial actions. |
| Input | ✅ zod schemas, a 64 KB body limit, and invalid JSON gives 400 |
| Errors | ✅ Customer-safe messages; unexpected errors are logged server-side and returned as a generic 500 |
| Rate limits | ⚠️ Inherited from the existing services and Better Auth. A per-token limit on `/api/mobile/v1/*` is recommended before the public launch. |

## Device and platform
| Check | Result |
|---|---|
| Exported Android components | ✅ Only `MainActivity` (the launcher). Firebase's receiver is protected by `c2dm.permission.SEND`; ProfileInstaller by `DUMP`. |
| Permissions | ✅ INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS (asked when the customer opts in), USE_BIOMETRIC/USE_FINGERPRINT, VIBRATE, WAKE_LOCK, and Firebase C2DM. **No camera, storage, location or contacts.** |
| Network | ✅ Release: HTTPS only, system certificate authorities only (network security config), and a CSP limited to `https://theprivate.in`. Debug builds allow the dev host only. |
| Mixed content / WebView debugging | ✅ Off in release. Local test builds enable them only through `CAP_LOCAL_DEV=1`; the synced config is git-ignored, and a normal `cap sync` restores it. |
| Deep links | ✅ A strict allowlist of hosts, paths and id shapes; unknown links are ignored. Private screens still require a session and a server ownership check. |
| Push payloads | ✅ Lock-screen text is generic; no routes, names, references or prices (verified on a device) |
| Sharing | ✅ Only public listing URLs |
| iOS app-bound domains | ⏸ Disabled until it can be verified on an iPhone (it needs a `WKAppBoundDomains` list) |
| Logs | ✅ No tokens or personal data logged. Errors show a calm screen; details go to the console in development only. |

## Data collected by the app (for the store privacy forms)
- **Account and contact:** name, e-mail, phone (optional). Used for app functionality and customer support.
- **User content:** flight requests (route, dates, passengers, requirements), enquiries, messages and notifications.
- **Identifiers:** the push token per device, used for app functionality.
- **Not collected:**
  - location;
  - contacts;
  - photos;
  - payment card data (no in-app payment);
  - browsing history.
- **No analytics or crash-reporting SDK is included in version 1, and no tracking or advertising.**

## Open items before public release
1. Rotate the Firebase service-account key.
2. Add a per-token rate limit on the mobile API.
3. Have counsel review the privacy policy for the app data flows; a draft addendum is in `APP_STORE_SUBMISSION.md`.
4. Verify on an iPhone: Keychain, Face ID, app-bound domains and ATS.
5. Have staff tooling complete account deletions (anonymise, revoke sessions and devices).
