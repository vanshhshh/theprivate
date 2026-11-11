# Mobile environment variables

## Website / backend (Vercel; server-only, never shipped in the app)
| Variable | Purpose | Example / source |
|---|---|---|
| `APPLE_TEAM_ID` | Serves `/.well-known/apple-app-site-association` (Universal Links). The file returns 404 until set. | 10 characters, from Apple Developer → Membership |
| `ANDROID_CERT_SHA256` | Serves `/.well-known/assetlinks.json` (App Links). The file returns 404 until set. | Play Console → App integrity → App signing key SHA-256. Comma-separated if more than one key. |
| `MOBILE_APP_ID` | App identifier used in both files | Defaults to `in.theprivate.app` |
| `FCM_SERVICE_ACCOUNT` | Push sending (FCM HTTP v1). Without it, push deliveries are recorded as "not configured". | Firebase → Project settings → Service accounts → generate a key, then **base64-encode the JSON** |

Existing variables the app relies on: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SMTP_*` (verification and password-reset e-mails), `PUBLIC_APP_URL`.

## App build (public: bundled into the app)
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Development and preview builds only. **Release builds ignore it** and always use `https://theprivate.in`. Preview builds require an `https://` value. |
| `VITE_PUSH_ENABLED` | `true` once the Firebase files are in the native projects. Until then, no push code runs. |

## Native files (git-ignored; added locally or by CI from secrets)
| File | Where | Source |
|---|---|---|
| `google-services.json` | `mobile/android/app/` | Firebase → Android app `in.theprivate.app` |
| `GoogleService-Info.plist` | `mobile/ios/App/App/` | Firebase → iOS app `in.theprivate.app` |
| `keystore.properties` and the upload `.jks` | `mobile/android/` and outside the repo | See ANDROID_SETUP.md |

**Never in the app:** the Razorpay keys, database URLs, SMTP credentials, the FCM service account or `BETTER_AUTH_SECRET`.
