# Mobile authentication

## Model
- **Same accounts:** the app uses the **same Better Auth accounts and sessions** as theprivate.in. There is no separate user table, token service or password store.
- **Bearer plugin:** Better Auth's official **bearer plugin** lets a request carry `Authorization: Bearer <session token>` instead of a cookie.
- **Same lookup:** `viewerFromHeaders()` resolves that to the same `Session` row the website uses, so the effects are identical for web and app:
  - the 14-day expiry and daily refresh;
  - server-side revocation on sign-out;
  - disabled or deleted accounts are refused;
  - roles.

## Flows
| Flow | App | Server |
|---|---|---|
| Create account | `POST /api/auth/sign-up/email` (name, e-mail, password, `callbackURL: '/account'`) | Production with SMTP: e-mail verification is required, and no session is returned; the app shows "Check your inbox". Elsewhere: a session is returned in `set-auth-token`. |
| Sign in | `POST /api/auth/sign-in/email` | Returns `set-auth-token`. An unverified e-mail gives 403, and a new confirmation link is sent. |
| Restore on launch | Read the token from the keystore, then `GET /api/mobile/v1/me` | 401 means the token is cleared and the user is signed out. Offline: the token is kept and private screens show an offline state. |
| Sign out | Delete the token from the keystore, then `POST /api/auth/sign-out` with the bearer token | The session row is revoked (tested). |
| Session expiry or revocation | Any 401 clears the token and shows signed-out UI | — |
| Password reset | "Forgotten your password? Contact us" (interim) | **B6 pending:** there is no reset flow on the website either. |

## Storage
- **iOS:** Keychain, `whenUnlockedThisDeviceOnly`, **iCloud sync off** (`@aparajita/capacitor-secure-storage`).
- **Android:** Android Keystore-backed encrypted storage. App data is excluded from cloud backup and device transfer (`dataExtractionRules`, `allowBackup=false`).
- **Desktop browser (development only):** memory, lost on reload.
- **Never used for the token:** `localStorage` or Capacitor Preferences. Preferences holds only the non-sensitive plan draft and recent airports.

## Origins and CORS
- **Better Auth:** `trustedOrigins` includes the app's own origins (`capacitor://localhost`, `https://localhost`).
- **CORS:** granted to those origins only, on `/api/auth/*` and `/api/mobile/*`, exposing `set-auth-token`. Cookies are not involved, so CSRF does not apply. The website's CSP and cookie behaviour are unchanged.

## Biometrics (Phase 6)
- **What it does:** an optional Face ID, Touch ID or fingerprint lock **in front of the locally stored session**, requested when returning after more than 5 minutes in the background. It never replaces the server session or the password.
- **Lock-out:** after failures or a device lock-out, the app falls back to signing out and signing in again.
