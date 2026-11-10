# Regression test report

Run on 2026-11-10 against the local development database and the isolated `theprivate_test` database. **No test touched Neon production.** Tests use SMTP capture mode and the sandbox (or a mocked) payment provider. There was one exception, explained in the note below: a single undeliverable verification e-mail to an `@example.com` test address. It is now fixed.

| Suite | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✓ no errors |
| Vitest, unit and integration (all suites) | ✓ **109 / 109** (re-run after the Razorpay Standard Checkout and e-mail verification changes) |
| Production build (`next build`) | ✓ |
| Playwright end-to-end (existing journeys) | ✓ **24 / 24**. The e2e server is now pinned to `SMTP_TRANSPORT=capture`; see the note below |
| Browser check of new pages (production build, test database) | ✓ all HTTP 200; no page or console errors |

## New tests

### `tests/unit/invitations.test.ts`
- Tokens: 256-bit and URL-safe; hashing is deterministic; the shape check rejects malformed tokens.
- Unsubscribe links are HMAC-signed, and tampering is rejected.
- Categorisation: a direct operator needs permit evidence; corporate flight departments, grade-D leads and services are excluded.
- Recipient choice:
  - ranked sources;
  - excludes unverified, do-not-contact, suppressed and shared addresses;
  - flags free-mail addresses.
- Composition:
  - no invented location or name;
  - includes the reason for receiving it, expiry, postal address and unsubscribe;
  - HTML is escaped.
- SMTP error classification (hard bounce vs transient vs auth).

### `tests/unit/onboarding-payments.test.ts`
- Fee blockers when the amount, tax or refund policy are missing.
- Tax rounding (half-up) and the quote total.
- The allowed status transitions.
- Snapshot matching on amount and currency.

### `tests/integration/invitations.test.ts`
- Live sending is refused while it is disabled; approval requires the exact recipient count and the send permission.
- Each invitation is sent once, never twice on a retried job; a hard bounce suppresses the address.
- Unsubscribes are honoured.
- GET never consumes a link; a link is bound to its own company; only the invited address can claim; replay fails.
- Expired, revoked and test links cannot claim; a company with an existing account holder blocks the claim.
- A claim creates a `SUBMITTED` claim for staff review and never grants membership.

### `tests/integration/onboarding-payments.test.ts`
- `PAID` is set only from a verified event; an invalid signature returns 401.
- Amount and currency mismatches are refused; duplicate webhooks are ignored (no second receipt or e-mail).
- The failed and cancelled paths work, and a retry creates a new checkout.
- Companies are isolated; refunds need the finance permission.
- Activation is blocked until paid, and payment alone does not activate; with the fee off it is "not required".

### Razorpay Standard Checkout (added 2026-11-10)

**Unit tests:**
- an order is created (never a payment link);
- the 100-minor-unit minimum;
- signature verification (forged, swapped and wrong-order cases), and nothing reaches the API before the signature passes;
- `order.paid` mapping;
- `payment.failed` is ignored;
- no webhooks without a secret;
- test keys are refused when `VERCEL_ENV=production`.

**Integration tests (mocked Razorpay API):**
- the in-page checkout URL;
- the session never contains the secret;
- a forged signature is refused and stays pending;
- an amount mismatch is refused;
- `captured` gives `PAID` once, with one e-mail;
- one company cannot open or verify another company's order.

**Browser (production build, test database, real test keys):** "Pay securely" goes through a 303 to the checkout page, and the Razorpay modal opens showing US$5,000 in test mode. No payment was submitted.

**Note:** the first e2e run after enabling e-mail verification exposed that the Playwright server inherited the real SMTP settings. One registration attempted a verification e-mail to a reserved `@example.com` test address, which cannot be delivered. `playwright.config.ts` now forces `SMTP_TRANSPORT=capture` and the sandbox payment provider.

## Areas checked for regressions

The existing suites for these areas all still pass:
- booking, quotes, charter payments, pricing;
- aircraft and marketplace;
- operator lifecycle.

The only change to existing business logic is one additional activation check, which applies **only when the onboarding fee is switched on**. It is off by default.

## Not tested

- Inbox delivery through Gmail SMTP. One [TEST] invitation was accepted by Gmail for the sending mailbox on 2026-11-10; arrival in the inbox is not yet confirmed.
- A completed test-card payment, and live Razorpay keys.
- (The migration and the operator import are now applied to Neon production.)
