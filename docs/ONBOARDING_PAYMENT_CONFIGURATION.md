# Company onboarding fee: configuration and decisions

## Decisions only ThePrivate can make (not invented here)

| Decision | Status | Where it is set |
|---|---|---|
| Exact onboarding fee | **Decided 2026-11-10: US$5,000** (`amountMinor` 500000) | Admin → Onboarding fees (`onboarding.fee.amountMinor`) |
| Currency | **Decided: USD.** Razorpay accepted a USD test order; live USD needs international payments enabled on the Razorpay account | Same page; per-country overrides are supported in the setting |
| Applicable taxes (for example 18 % GST in India; UAE VAT 5 % if registered) | **Needed, and must be confirmed by your accountant** | Tax rate (%) and label. Empty means "not decided" and blocks collection; 0 means "no tax". |
| Refund and cancellation policy | **Needed (legal text)** | Shown to companies before they pay. Collection is blocked without it. |
| Payment provider | **Decided: Razorpay Standard Checkout.** Test keys are configured locally; live keys are still needed | `ONBOARDING_PAYMENT_PROVIDER=razorpay` |
| Supported payment methods | Decided by the provider account (Razorpay: cards, UPI, net banking, wallets) | Razorpay dashboard |
| Invoice requirements (GST tax invoice, GSTIN, HSN/SAC) | **Needed** | Today a **receipt** is issued, explicitly "not a tax invoice unless issued as one" |
| Whether the fee applies to every country | **Needed** | The `byCountry` overrides in the setting |

Until amount, tax treatment and refund policy are all set **and** collection is switched on, companies see "Payment is not available yet". Activation is gated on payment only while the fee is switched on.

## Where the fee sits in onboarding

1. The company claims its profile, and staff approve the claim.
2. Profile review.
3. Verification documents are uploaded.
4. Staff verify.
5. The agreement is signed (`AGREEMENT_SIGNED`).
6. **The onboarding fee is paid:** `PAID`, shown to the company as "submitted for final review".
7. Staff complete the final review and activate (`ACTIVE`). **Activation is blocked until the fee is paid** while a fee applies.

Payment never verifies a company or its aircraft, never activates it, never routes flight requests to it, never publishes inventory, and never guarantees acceptance. This is stated on the payment page, the confirmation, the receipt and in the e-mails.

## How a company pays (Razorpay Standard Checkout)

1. **Pay securely** posts to `/operator/onboarding-payment/start`. This is a same-origin check plus the owner or manager role. The server creates a Razorpay **Order** (`POST /v1/orders`) for the snapshot amount and answers with a 303 to `/operator/onboarding-payment/checkout/<order_id>`.
2. That page loads Razorpay's `checkout.js` and opens the modal for the order. Card details are entered **inside Razorpay's iframe**. Only the public key id reaches the browser; it is passed as a page prop, never as `NEXT_PUBLIC_*`.
3. On success, the modal returns `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature`. The server action `verifyCheckoutAction` then:
   - checks `HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)` in constant time;
   - **fetches the payment from Razorpay** (`GET /v1/payments/:id`);
   - requires that it belongs to this order and that the amount and currency equal the snapshot;
   - marks it `PAID` only if Razorpay reports `captured` (`authorized` becomes `PAYMENT_PROCESSING`).
   
   A wrong signature is refused and recorded, and the payment is not marked paid.
4. **Closing the modal** charges nothing; the order stays open, and "Try again" reopens it. **A declined attempt** is shown to the user, who can retry in the same modal. A single failed attempt never closes the order.

The checkout page alone gets a CSP that admits `checkout.razorpay.com` (script) and `api.razorpay.com` (frames and connections). The rest of the site keeps the strict policy. This is why step 1 is a full-page POST rather than a client-side navigation.

## Production configuration (Razorpay)

| Variable | Value |
|---|---|
| `ONBOARDING_PAYMENT_PROVIDER` | `razorpay` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | From the Razorpay dashboard. **Test keys (`rzp_test_…`) are refused on the Vercel Production deployment** (`VERCEL_ENV=production`), so a test-card payment can never mark a real company paid. They work locally and on Preview deployments. |
| `RAZORPAY_WEBHOOK_SECRET` | Optional. It adds a second confirmation channel; without it, all webhooks are refused. |
| `ONBOARDING_PAYMENTS_LIVE` | `true` **only after your explicit approval**. Required for live keys; test keys don't need it. |
| `PUBLIC_APP_URL` | `https://theprivate.in` |

**Optional webhook:** `https://theprivate.in/api/webhooks/onboarding-payments/razorpay`, with these events:
- `order.paid`
- `refund.processed`

`payment.failed` is deliberately ignored, because the customer may retry the same order.

The sandbox provider (`ONBOARDING_PAYMENT_PROVIDER=sandbox`) exists for development and tests. **It is refused in production builds**, so a fee can never be marked paid without real money.

## Architecture

**Data:**
- `OnboardingPayment` holds a snapshot of fee, tax, total and currency (in minor units) taken when the order is created. It also stores the provider order and payment ids, status, receipt number and refunded amount.
- `OnboardingPaymentEvent` holds the status history. The provider event id is unique, so a repeated webhook is a no-op.
- None of this touches the charter `Payment` table, booking logic, payouts or commissions.

**Statuses:**
- `PAYMENT_PENDING` → `PAYMENT_PROCESSING` → `PAID` → `REFUND_PENDING` → `REFUNDED`
- Side exits: `PAYMENT_FAILED`, `PAYMENT_CANCELLED`, `PAYMENT_REVERSED`
- `NOT_REQUIRED` is derived, when the fee is switched off.

Only allowed transitions apply (`canTransition`); anything else is recorded and ignored.

**Security:**
- The amount comes only from server settings. The browser never sends an amount.
- Card data never touches ThePrivate (hosted checkout).
- `PAID` is set only from a **verified** event: the HMAC signature over the raw body is checked, and the amount and currency must **exactly** match the snapshot. A mismatch is refused, recorded and alerted to a super admin.
- The return page shows only what the server has confirmed.
- One open checkout per company (a database advisory lock). It is reused on repeated clicks and refused once paid.
- Every query is scoped to the member's own company.
- Refunds and fee configuration need `onboarding_payment.manage` (super admin) and are audited with a reason.

**E-mails** (de-duplicated jobs; sent only after server confirmation):
- payment started;
- payment received and submitted for review (with the receipt link);
- payment failed;
- refund processed.

## Files

| Kind | Files |
|---|---|
| New | `src/domain/payments/onboarding.ts`, `src/server/payments/onboarding/{providers,service}.ts`, `src/app/api/webhooks/onboarding-payments/[provider]/route.ts`, `src/app/operator/(workspace)/onboarding-payment/**`, `src/app/admin/onboarding-payments/**` |
| Changed | `src/server/settings.ts` (the `onboarding.fee` setting), `src/server/services/operators.ts` (one activation check), `src/server/auth/permissions.ts`, admin and workspace navigation |

## Tested (sandbox, test database)

- **Amounts:** a snapshot was taken and was unaffected by later configuration changes; tax rounding is correct.
- **Payment events:** the paid path, failed path and cancellation all work. A failed payment is final, and a retry creates a new checkout.
- **Duplicates:** a duplicate webhook produces no second e-mail or receipt.
- **Rejected events:** an invalid signature is refused (401); amount and currency mismatches are refused.
- **Isolation:** one company cannot complete or cancel another's payment.
- **Refunds:** refused without the finance permission; works with it and is audited.
- **Activation:** blocked until paid; payment alone does not activate.
- **Fee off:** shows not required.

**Razorpay (2026-11-10):**
- **Test keys:** create a US$5,000 order (HTTP 200).
- **Browser:** the production build opens the Razorpay modal on the checkout page, showing US$5,000 in test mode.
- **Unit and integration tests, with Razorpay's API mocked:**
  - order creation;
  - the minimum-amount check;
  - signature checks (forged, swapped, wrong order);
  - an amount mismatch is refused;
  - `captured` gives `PAID`, sent once;
  - `authorized` gives processing;
  - company isolation;
  - test keys refused on Production.

**Not yet done:** a completed test-card payment through the modal. Use Razorpay's test card on a local or Preview deployment. Live keys have not been used.
