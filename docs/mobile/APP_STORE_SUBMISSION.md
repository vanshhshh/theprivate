# App Store submission package (iOS)

**Status: prepared, not submitted.** Submission needs:
- a paid Apple Developer Program membership;
- a Mac or CI build;
- the production backend deployed;
- your approval.

**Account:** Team `3J5MTMY4J8`, **Individual**. The App Store will show the account holder's name as the seller. If ThePrivate is a company, decide on an Organisation account (D-U-N-S) before paying.

## App record (App Store Connect → Apps → New App)
| Field | Value |
|---|---|
| Name | ThePrivate |
| Bundle ID | `in.theprivate.app` |
| SKU | `theprivate-ios` |
| Primary language | English (U.K.) |
| Category | Travel (primary), Business (secondary) |
| Age rating | 4+ (no objectionable content). The questionnaire answers are all "None". |
| Price | Free; no in-app purchases |

## Listing text
- **Subtitle (30 characters max):** `Private flights, arranged`
- **Promotional text (170 characters max):** Plan a private flight in minutes. Licensed flight partners reply with offers you can compare, and every trip lives in one place.
- **Keywords (100 characters max):** `private jet,charter,flight,aviation,business jet,empty leg,one-way,helicopter,aircraft,travel`
- **Description:**

> ThePrivate makes private flights simple to arrange.
>
> PLAN A FLIGHT
> Choose where you're flying from and to, from airports worldwide, plus your date and passengers, and send one request. Licensed flight partners reply with priced offers.
>
> COMPARE OFFERS CLEARLY
> See each offer's aircraft, total price, taxes and conditions side by side. Nothing is booked until you confirm.
>
> EVERY TRIP IN ONE PLACE
> Follow your requests, offers and bookings, with departure times shown in each airport's local time. Get notified when an offer arrives or your trip changes.
>
> ONE-WAY OFFERS AND AIRCRAFT FOR SALE
> Discover aircraft already flying a route, and explore aircraft listed for sale. Enquiries go through ThePrivate.
>
> PRIVATE BY DESIGN
> Optional Face ID lock. Notifications never show routes or prices on your lock screen.
>
> ThePrivate arranges flights. Every flight is operated by an independent, licensed air operator.

- **Support URL:** `https://theprivate.in/contact`
- **Marketing URL:** `https://theprivate.in`
- **Privacy policy URL:** `https://theprivate.in/legal/privacy`
- **Account deletion:** in the app (Profile → Delete account), plus the public page `https://theprivate.in/delete-account`

## Screenshots
**6.7-inch iPhone (1290 × 2796):** `mobile/store/appstore/` (6 images):
1. Discover;
2. airport search;
3. planner;
4. request review;
5. request sent;
6. Journeys.

They are rendered from the real app. Screens that would show sample data presented as real offers are excluded.

## App Privacy ("nutrition label")
Based on the actual data flows (see MOBILE_SECURITY_REVIEW.md). **None of the data is used for tracking.**

| Data type | Collected | Linked to the user | Purpose |
|---|---|---|---|
| Contact info: name, e-mail address, phone number (optional) | Yes | Yes | App functionality, customer support |
| User content: other (flight requests, enquiries, messages) | Yes | Yes | App functionality |
| Identifiers | Push token only, which Apple does not classify as a device ID. Confirm with counsel. | — | — |
| Location, contacts, photos, browsing, financial info, diagnostics, usage data | **No** | — | — |

## Review notes (paste into App Review Information)
> ThePrivate is a marketplace that arranges private charter flights. It does not operate aircraft: flights are operated by independent, licensed air operators, who send priced offers in response to a customer's request. The flight itself is a physical service delivered outside the app; there are no in-app purchases or digital goods (guidelines 3.1.3(e) and 3.1.5). Payment for a confirmed charter is arranged outside the app after the operator confirms.
>
> Demo account: (created on the production site at submission time)
> E-mail: ………… Password: …………
> To test: Plan → choose any two airports → date → Send a flight request. Journeys shows the request. Profile → Delete account starts account deletion.

## Export compliance
The app uses only standard HTTPS and the iOS Keychain, so it is exempt. Set `ITSAppUsesNonExemptEncryption = NO` at submission, once you have confirmed this as the account holder.

## Before submitting (iOS-specific)
- [ ] Paid membership; APNs key uploaded to Firebase; App Store Connect API key created.
- [ ] `GoogleService-Info.plist` added to the Xcode target (on a Mac or by CI).
- [ ] Associated Domains `applinks:theprivate.in`; `APPLE_TEAM_ID=3J5MTMY4J8` set in Vercel.
- [ ] Tested on a real iPhone: Keychain, Face ID, push, Universal Links, safe areas.
- [ ] Demo account created on production.

## Privacy policy addendum (draft for counsel; not published)
> **Mobile app.** If you use the ThePrivate app, we process the same account information as on our website. We also process a push-notification token for each device on which you turn on notifications, to send you updates about your requests, offers and trips. Notification text on your lock screen does not include routes, names or prices. If you turn on Face ID or fingerprint unlock, the check happens on your device; we never receive your biometric data. Your sign-in session is stored in your device's secure storage (Keychain or Keystore) and is not included in device backups. You can turn notifications off in the app or in your device settings, and request account deletion in the app (Profile → Delete account) or at theprivate.in/delete-account.
