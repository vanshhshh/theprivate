# Mobile test report

Final run: 2026-11-11, commit after Phase 12. All runs are local; production was not touched.

## Automated
| Suite | Result |
|---|---|
| Website typecheck | ✅ clean |
| Website Vitest (unit + integration, including 11 mobile-API tests with real bearer sessions) | ✅ **122 / 122** |
| Website Playwright journeys | ✅ **24 / 24** |
| Website production build | ✅ (includes `/api/mobile/v1/*`, `/.well-known/*`, `/forgot-password`, `/reset-password`, `/delete-account`) |
| App typecheck | ✅ clean |
| App unit tests | ✅ **12 / 12** |
| App release bundle | ✅ built; secret and development-host scan passed; CSP is `connect-src 'self' https://theprivate.in` |
| Signed Android release | ✅ AAB 9.8 MB and APK 10.9 MB, verified with `apksigner`/`jarsigner`; `in.theprivate.app` 0.1.0 (1); targetSdk 36 |

## Manual and device
| Test | Result |
|---|---|
| Browser walkthrough (phone viewport, local backend, test database), 21 steps including deletion and password reset | ✅ 0 console or server errors (after the fixes below) |
| Android emulator (API 36.1, Play Store image): install, splash, tabs | ✅ |
| Android emulator, real Firebase: opt-in → OS dialog → registration → push **SENT** → generic notification shown → tap opens the request | ✅ |
| Real Android phones | ⛔ None available |
| iOS (simulator or device) | ⛔ No Mac; membership not paid |

## Measurements (development PC, emulator)
- **Release JavaScript at start-up:** 375 KB (down from 414 KB); 9 secondary screens load on demand.
- **Fonts:** Latin and Latin Extended only, WOFF2 only, with the real italic included.
- **Package size:** APK 10.9 MB / AAB 9.8 MB. Most of it is the licensed photography.
- **Frame rate and start-up time on real hardware: not measured.** The emulator ran in 1 GB of RAM on a 7.8 GB PC, which says nothing about phone performance. Measure on the release-candidate devices.

## Defects found and fixed during testing
1. Chromium's `scrollTo()` returns a Promise, which React treated as an effect cleanup and crashed on navigation (it would also have crashed the Android WebView).
2. The plan draft wasn't hydrated before screens redirected, after a cold start or deep link.
3. A redirect raced the navigation after a request was submitted.
4. Sign-up was rejected: the absolute `callbackURL` wasn't a trusted origin. It is now relative.
5. **Better Auth plugin order:** `nextCookies()` must be last; this affected website cookies in production.
6. **An FCM token was registered before notification permission was granted.**
7. Mixed content blocked local test builds (local-only fix, behind `CAP_LOCAL_DEV`).
8. The Newsreader italic was missing, so the WebView synthesised a faux italic.
9. The website's `/api/files/:id` returned 500 for a missing stored file; it now returns 404.
10. Broken listing photos now fall back to "Photos on request".
11. "1 partners contacted" is now pluralised correctly.
12. The Firebase web SDK was being pulled into the bundle; it is now stubbed (native push only).

## Environment notes
- The PC's drive-letter casing (`c:` vs `C:`) makes Vitest load two module copies. Run tests from `C:\…`.
- Emulator: start with `-memory 1024` (or 1536) and close other applications; 7.8 GB of RAM is the limit.
