# iOS setup

## Project
- **Location:** `mobile/ios`, a Capacitor 8 native project using **Swift Package Manager**, so no CocoaPods is needed. It is committed to git.
- **Bundle ID:** `in.theprivate.app` (**proposed**; confirm it before registering it with Apple).
- **Deployment target:** iOS 15.0. Marketing version 1.0, build 1 (aligned with `package.json` and CI at release time).
- **Display name:** "ThePrivate".

## What can and cannot be done on this PC
The development computer runs **Windows 11**. Xcode only runs on macOS, so here I can:
- ✅ generate and update the iOS project (`npx cap sync ios`), the icons and launch screen (done), and the configuration;
- ❌ not compile, run the iOS Simulator, test on an iPhone, archive or sign.

**I will not report an iOS build or signing as done until it has actually been performed on a Mac.**

## Building on a Mac (or a cloud Mac / GitHub Actions `macos-15`)
```bash
cd mobile
npm ci
npm run build            # production web bundle
npx cap sync ios
npx cap open ios         # Xcode → choose the App scheme → a simulator → Run
```

**CI route (planned):** a GitHub Actions `macos` job builds, archives with `xcodebuild` and uploads to TestFlight. These secrets are stored as encrypted GitHub secrets and never committed:
- the distribution certificate (.p12) and its password;
- the provisioning profile;
- an App Store Connect API key (.p8, key id, issuer id).

## Capabilities to enable when the Apple account exists
| Capability | Why | Needs |
|---|---|---|
| Associated Domains `applinks:theprivate.in` | Universal Links | Team ID, plus `apple-app-site-association` on theprivate.in (B5) |
| Push Notifications (+ Background Modes → remote notifications) | Offer and booking updates | An APNs auth key (.p8), uploaded to Firebase |
| Keychain Sharing (default group) | Secure session storage | — |
| Face ID usage description | Biometric app lock | `NSFaceIDUsageDescription` text |

**Permission descriptions** are added with each feature, worded for review:
- Camera: "Take a photo of a travel document to attach it to your booking."
- Photo library: "Choose a document to attach to your booking."
- Face ID: "Unlock ThePrivate with Face ID."

**Export compliance:** the app uses only standard HTTPS and the iOS Keychain. The usual answer is "exempt" (`ITSAppUsesNonExemptEncryption = false`), to be confirmed by you as the account holder at submission.

## Apple account (2026-11-11)
- **Team ID:** `3J5MTMY4J8`, set as `DEVELOPMENT_TEAM` in the Xcode project.
- **Account type:** Individual. The App Store would list **the account holder's personal name** as the seller. Decide on an Organisation account (D-U-N-S) before paying, if ThePrivate is a company.
- **Membership:** **not yet paid.** Until it is, there is no APNs key, App Store Connect API key, app record, TestFlight or Associated Domains. iOS work is paused at "project ready"; Android continues.

## Placeholders that are not invented
These are left blank on purpose until you provide them:
- Team ID;
- signing certificate;
- provisioning profile;
- organisation name;
- App Store Connect app record.

## What I need from you
- **Apple Developer Program enrolment as an organisation:** the legal entity name, a D-U-N-S number, an authorised signatory, and a website on the company domain.
- **Access to a Mac,** or approval for a cloud Mac or GitHub Actions macOS minutes.
- **An iPhone** (one recent, one older) for real-device testing, or approval for a device cloud.
