# Google Play submission package (Android)

**Status: release build ready, not uploaded.** Upload needs:
- a Google Play Console account;
- the production backend deployed;
- your approval.

## Artefacts (built 2026-11-11, signed with the upload key)
| File | Use |
|---|---|
| `mobile/android/app/build/outputs/bundle/release/app-release.aab` (9.8 MB) | Upload to Play (Play App Signing) |
| `mobile/android/app/build/outputs/apk/release/app-release.apk` (10.9 MB) | Direct install for testers (works once the backend is deployed) |

- **Package:** `in.theprivate.app`. Version 0.1.0, versionCode 1. minSdk 24, targetSdk **36**, which meets Play's current target-API requirement.
- **Upload key:** `mobile/signing/theprivate-upload.jks` (git-ignored). Its password is in the git-ignored `mobile/android/keystore.properties`.
  - **Upload-key certificate SHA-256:** `5E:6C:E3:34:2F:2A:6E:7E:94:5C:C3:C8:2B:AF:85:31:F8:26:C7:B8:EF:B2:09:E2:9E:6A:00:A5:CA:6F:95:CA`
  - **Back up both files to a password manager now.** If the upload key is lost, Google can reset it, but only through a support request.
- **App Links:** after the first upload, copy the **app signing key** SHA-256 from Play Console → Test and release → App integrity into `ANDROID_CERT_SHA256` in Vercel.

## Store listing
| Field | Value |
|---|---|
| App name (30 characters max) | ThePrivate |
| Short description (80 characters max) | Plan a private flight, compare offers from licensed partners, track every trip. |
| Category | Travel & Local |
| Tags | Travel, Flights, Business travel |
| Contact e-mail | your support address (not yet provided) |
| Website | https://theprivate.in |
| Privacy policy | https://theprivate.in/legal/privacy |
| Account deletion URL | **https://theprivate.in/delete-account** (public page, added locally) |

**Full description:** the same text as the App Store description in `APP_STORE_SUBMISSION.md`, with "Face ID" replaced by "fingerprint or face unlock".

**Graphics** (`mobile/store/play/`):
- Feature graphic: `feature-graphic-1024x500.png`.
- Phone screenshots, 1080 × 1920 (6 images): `phone-1…6-*.png`.
- App icon, 512 × 512: from `mobile/resources/icon-only.png`, resized at upload.

## Data safety form (answers from the real data flows)
- **Data is encrypted in transit:** Yes (HTTPS only).
- **Users can request deletion:** Yes (in the app, and at theprivate.in/delete-account).
- **Shared with third parties:** No. Firebase Cloud Messaging is a service provider processing the push token on our behalf, which isn't "sharing" under Play's definition.

| Category | Type | Collected | Optional | Purpose |
|---|---|---|---|---|
| Personal info | Name | Yes | Required | App functionality, account management |
| Personal info | Email address | Yes | Required | App functionality, account management |
| Personal info | Phone number | Yes | Optional | App functionality |
| Messages / user content | Other in-app messages and requests (flight requests, enquiries) | Yes | Required for the feature | App functionality |
| Device or other IDs | Push token | Yes | Optional (only when notifications are on) | App functionality |
| Location, financial, health, photos, contacts, browsing, app activity, diagnostics | — | **No** | — | — |

## Other declarations
| Item | Answer |
|---|---|
| Content rating (IARC) | No violence, sexuality, gambling, drugs or user-to-user public communication. Expected rating: Everyone / PEGI 3. |
| Target audience | 18 and over (charter booking is for adults; no child-directed content) |
| Ads | No ads |
| App access | Restricted: provide a demo account (production, created at submission) and the steps "Plan → airports → date → Send a flight request". |
| Financial features | None in the app (no payments, loans or crypto) |
| Government app | No |
| Health | No |

## Release tracks
1. **Internal testing** (up to 100 testers, no review wait): the first upload.
2. **Closed testing:** new personal developer accounts must run a closed test with 12 or more testers for 14 days before production. Organisation accounts are exempt.
3. **Production:** only with your explicit approval.
