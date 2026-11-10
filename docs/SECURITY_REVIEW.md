# Security review: invitations, SMTP and the onboarding fee

Reviewed on 2026-11-10. It covers the new attack surface and what proves each control.

## Threats and controls

| Threat | Control | Evidence |
|---|---|---|
| Guessing an invitation link | 256-bit random tokens; only the SHA-256 hash is stored; the shape is checked before any lookup | `tests/unit/invitations.test.ts` "tokens" |
| Editing a link to claim another company | The token contains no id; it is bound server-side to one company and one address | integration "binds a link to its own company" |
| Someone else using a forwarded or stolen link | The claim requires a signed-in session whose e-mail **equals** the invited address, plus an explicit authorisation checkbox | integration "lets only the invited address claim" |
| Replaying a used link | A conditional single-use update; a second claim fails | same test, replay assertion |
| Mail scanners or link previews consuming links | GET is read-only; the claim is a POST | integration "never consumes the link on GET" |
| Token leakage through Referer, caches, crawlers or analytics | `no-referrer`, `no-store`, `noindex`, robots disallow; no third-party scripts on the page | `next.config.ts`, `robots.ts` |
| A database leak exposing working links | Only hashes are stored; raw tokens are never written or logged | code review of `service.ts` |
| An invitation silently taking over a company | Claims never grant membership; staff approve (the lifecycle allows `DISCOVERED → CLAIMED` only for staff); an existing account holder blocks the claim | integration "already has an account holder", claim status `SUBMITTED` |
| Ownership disputes involving free-mail or off-domain addresses | Flagged in the claim's review note | `claimViaInvitation` |
| Sending to real companies by accident | `LIVE_SEND_ENABLED` defaults to off; the `invite.send` permission; the exact-count confirmation; the typed SEND; re-checks at approval; test sends only to the sender's own address | integration "refuses live sending…", "requires the exact recipient count…" |
| Duplicate e-mails from retries or two campaigns | `QUEUED → SENDING` conditional update; unique job dedupe keys; a strict eligibility re-check at approval | integration "never twice on a retried job" |
| Hammering a suppressed or bounced address | A suppression check before every send; hard bounces are suppressed and never retried | integration "honours unsubscribes"; unit "SMTP error classification" |
| Forged unsubscribe links | HMAC-signed and timing-safe compared | unit "signs unsubscribe links and rejects tampering" |
| SMTP credentials leaking | Server-only module; no logger; classified errors; status omits the password; `.env*` ignored | `mailer.ts`, `.gitignore` |
| Forged payment confirmations | HMAC over the raw body; constant-time compare; 401 on mismatch | integration "marks PAID only on a verified event"; unit "webhook signatures" |
| Underpaying (amount or currency tampering) | The amount comes from server settings; snapshot at order; confirmation must match exactly | integration "refuses a confirmation whose amount or currency differs" |
| Double charging or double receipts | A per-company advisory lock; one open checkout; unique provider event ids; e-mail dedupe keys | integration "ignores duplicates" |
| Fake money in production | The sandbox provider is refused when `NODE_ENV=production`; live collection also needs `ONBOARDING_PAYMENTS_LIVE=true` | `providers.ts` |
| Cross-company payment access | All queries are scoped to the member's company; foreign ids return not-found | integration "keeps companies isolated" |
| Unauthorised refunds or fee changes | `onboarding_payment.manage` (super admin); audited with a reason | integration "refunds only with the finance permission" |
| CSV formula injection in the export | Cells are quoted and leading `= + - @` are neutralised | `export/route.ts` |
| Forged Razorpay checkout success | `HMAC-SHA256(order_id\|payment_id, KEY_SECRET)` is checked in constant time; the payment is then fetched from Razorpay's API and must belong to the order and match the snapshot | unit "verifies the checkout signature…"; integration "marks PAID only after signature and API verification" |
| Razorpay secret reaching the browser | The secret is used only in `providers.ts` (server-only); the page receives only the key id as a prop; there is no `NEXT_PUBLIC_RAZORPAY_*` variable | integration asserts that the checkout session contains no secret |
| Test-card payments on the live site | `rzp_test_` keys are refused when `VERCEL_ENV=production` | unit "refuses test keys on the production deployment" |
| Widening the CSP | Razorpay origins are allowed **only** on `/operator/onboarding-payment/checkout/*`; that page is reached by a full-page 303 so its own CSP applies; the start endpoint checks the request's origin | `next.config.ts`, `start/route.ts` |
| Cron endpoint abuse | Off without `CRON_SECRET`; constant-time bearer comparison | `api/cron/worker/route.ts` |

## Residual risks and recommendations

1. **E-mail account takeover.** Whoever controls an invited mailbox can claim, which is the intended trust model, but staff still review every claim. Keep the review step; don't auto-approve.
2. **E-mail verification at sign-up is now on**:
   - **When:** in production builds whenever real SMTP is configured (`emailVerificationRequired()` in `auth.ts`).
   - **What it does:** new accounts must confirm through a 24-hour link before they can sign in, and signing in while unverified re-sends the link.
   - **Where it stays off:** local development and capture-mode test runs.
   - **Override:** `AUTH_REQUIRE_EMAIL_VERIFICATION=false` turns it off.
3. **Gmail as the sender.** Free-mail outreach has lower trust and daily limits. Move to a domain mailbox with SPF, DKIM and DMARC first (`SMTP_CONFIGURATION.md`).
4. **Asynchronous bounces** are not automated yet; they are suppressed manually. Add a provider webhook later.
5. **Razorpay integration** is implemented, but not exercised against the live API (no keys). Test in Razorpay test mode before enabling.
6. **Rate limiting the claim page** is inherited from the platform defaults. Tokens are 256-bit, so brute force is infeasible regardless.
