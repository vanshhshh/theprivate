# Mobile roadmap

## Release 1 (built): customer app
Discover, planner, results, flight requests, journeys, offer comparison and acceptance, bookings, one-way offers, aircraft for sale, inbox, profile, account deletion, password reset, push, biometric lock, app links, offline handling.

## Before public launch (from the release checklist)
1. Production deployment of the mobile backend; rotate the Firebase key.
2. Real-device testing (Android and iPhone); fix whatever it finds.
3. Per-token API rate limits; counsel review of the privacy policy.
4. Staff tooling to **complete** account deletions (anonymise, revoke sessions and devices).

## Release 1.1: proposed
| Item | Why | Backend work |
|---|---|---|
| Notification preferences per category (offers, trips, account) | Push is all-or-nothing per phone today | A preferences model |
| Travel documents (passports, visas) with camera upload | The brief asks for it; there is no customer document feature on the website yet | **New capability:** storage rules, access control, retention policy, legal review |
| Messaging with the ops desk inside a booking | Messages currently arrive as notifications only | A conversation model |
| Privacy-respecting crash reporting (e.g. Sentry, with personal data stripped) | Faster fixes in the field | A DSN, and an update to the privacy declarations |
| Product analytics (counts only: search started, request sent, offer viewed) | Measure the funnel without personal data | An events endpoint or provider; consent where required |
| Return-flight results and multi-leg planner UI | The server already supports up to 6 legs | None |
| Dynamic type (respect the OS text size up to 130 %) | Accessibility | None |
| Saved passengers | Faster requests | A model, plus a review of personal data |

## Release 2: proposed
- Charter payment in the app through the approved provider, if and when the payment rules and provider approval allow it (the flight is a physical service, so no in-app purchase).
- Partner (operator) app for quoting on the move.
- Widgets and Live Activities for the next trip.
