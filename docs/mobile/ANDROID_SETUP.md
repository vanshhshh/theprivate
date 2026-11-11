# Android setup

## Project
- **Location:** `mobile/android`, a Capacitor 8 native project committed to git.
- **App ID:** `in.theprivate.app`. This is **proposed**; confirm it before the first Play upload, because it cannot change afterwards.
- **SDK:** compile and target SDK 36, minimum SDK 24 (Android 7.0). AGP 8.13, Gradle 8.14.3, Java 21.
- **Version:** `versionName` comes from `mobile/package.json`. `versionCode` comes from `TP_VERSION_CODE` (CI), and defaults to 1.

## Build on this PC (Windows)
```bash
cd mobile
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"   # JDK 21 bundled with Android Studio
npm install
npm run android:debug        # dev web build → cap sync → gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```
- **`android/local.properties`** points at the SDK. It is git-ignored; create it with `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`.
- **Emulator:** the AVD is `Medium_Phone_API_36.1`.
  - On this PC (7.8 GB RAM), close other applications first and start it with `-memory 1536 -gpu host`.
  - With less free memory the system UI times out.

## Environments
| Build | Command | Backend |
|---|---|---|
| Debug (development) | `npm run android:debug` | `VITE_API_BASE_URL`, or the host machine at `http://10.0.2.2:3000` (cleartext is allowed **only** in the debug network configuration, only for 10.0.2.2 and localhost) |
| Release | `npm run build && npx cap sync android && cd android && gradlew bundleRelease` | Pinned to `https://theprivate.in`; HTTPS only |

## Security settings already applied
- **Backups:** `allowBackup="false"`, and `dataExtractionRules` exclude everything from cloud backup and device transfer.
- **Network:** the release network-security configuration is HTTPS only and trusts system certificate authorities only.
- **Debugging:** WebView debugging is disabled in the Capacitor configuration.
- **Permissions:** only `INTERNET` is requested today. Camera, notification and biometric permissions are added with their features and requested at the point of use.

## Release signing (placeholders, nothing committed)
Use **Play App Signing**: Google holds the app signing key, and we keep only an **upload key**.

1. **Generate the upload key once,** after you approve, and store it outside the repo, e.g. in a password manager:
   ```bash
   keytool -genkeypair -v -keystore theprivate-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
2. **Local signing:** create `mobile/android/keystore.properties` (git-ignored):
   ```
   storeFile=C:/secure/theprivate-upload.jks
   storePassword=…
   keyAlias=upload
   keyPassword=…
   ```
3. **CI signing:** supply these as GitHub encrypted secrets instead:
   - `TP_UPLOAD_STORE_FILE` (the path after decoding a base64 secret);
   - `TP_UPLOAD_STORE_PASSWORD`;
   - `TP_UPLOAD_KEY_ALIAS`;
   - `TP_UPLOAD_KEY_PASSWORD`.
4. **Build the bundle:** `gradlew bundleRelease` produces `app-release.aab`. Without signing configured, release builds come out **unsigned** and are not uploadable.

**For App Links:** after the first Play upload, copy the **app signing key SHA-256** from Play Console → App integrity. It goes into `https://theprivate.in/.well-known/assetlinks.json` (backend change B5).

## What I need from you
- A Google Play Console organisation account.
- Confirmation of the app ID.
- Approval to generate the upload key, and where to store it.
- A real Android phone, or approval to use a device cloud, for testing.
