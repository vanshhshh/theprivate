# Company invitation architecture

## Lifecycle

```
eligibility (computed) ─► READY ─► (preview / TEST_SENT) ─► approval gate ─► QUEUED ─► SENDING ─► SENT
                                                                                │          │
                                                    BOUNCED (address suppressed) ◄┘          ├─► link visited (recorded, no state change)
                                                    FAILED (retries exhausted / unknown)     ├─► CLAIMED ─► claim reviewed by staff (existing flow)
                                                                                             ├─► EXPIRED (sweep) ─► resend (new link)
                                                                                             └─► REVOKED (staff)
UNSUBSCRIBED can occur at any point before sending (suppression list)
```

`DELIVERED` and `OPENED` exist in the schema but are **never set automatically**: SMTP gives no delivery receipt, and visits by mail scanners are not reliable opens. They are reserved for provider evidence such as a future bounce or delivery webhook.

**Claiming is not verification.** An invitation claim creates an ordinary `OperatorClaim` (`SUBMITTED`) for staff review. The existing lifecycle allows `DISCOVERED → CLAIMED` **only by staff**. Verification, the agreement, the onboarding fee and activation all continue through the existing, unchanged workflow.

## Components

### New files

| File | Purpose |
|---|---|
| `src/domain/invitations/eligibility.ts` | Pure functions: company category, choice of recipient address, eligibility reasons |
| `src/domain/invitations/compose.ts` | Pure function: writes one company's e-mail from facts on record only |
| `src/server/invitations/tokens.ts` | 256-bit tokens (OS CSPRNG), SHA-256 hashing, signed unsubscribe parameters |
| `src/server/invitations/service.ts` | Candidates, campaigns, the approval gate, the background send, sweeps, suppression, view and claim |
| `src/server/email/mailer.ts` | Server-only SMTP (nodemailer); error classification; capture transport for tests |
| `src/server/email/outbox.ts` | Transactional e-mails as de-duplicated jobs |
| `src/app/(public)/claim/[token]/page.tsx`, `claim-form.tsx`, `../actions.ts` | Invitation landing page (read-only GET) and the explicit claim POST |
| `src/app/(public)/unsubscribe/*`, `src/app/api/unsubscribe/route.ts` | Unsubscribe confirmation, and the RFC 8058 one-click endpoint |
| `src/app/admin/invitations/*` | Campaign UI, preview, test send, approval, revoke and resend, CSV export |
| `src/app/api/cron/worker/route.ts` | Secured single pass of the job queue (for Vercel) |
| `scripts/invitations/manifest.ts` | Dry-run recipient manifest (no sends, no writes) |

### Changed files (minimal)

| File | Change |
|---|---|
| `prisma/schema.prisma` | New models and enums; back-relations on `Operator` |
| `src/server/jobs/worker.ts` | New job types and the invitation sweep |
| `src/server/auth/permissions.ts` | New permissions: `invite.manage`, `invite.send` |
| `src/app/admin/layout.tsx` | Navigation item |
| `src/app/operator/onboarding/page.tsx` | Confirmation shown after a claim |
| `next.config.ts` | No-referrer, no-store and noindex headers on `/claim/*` and `/unsubscribe` |
| `src/app/robots.ts` | Disallow `/claim` and `/unsubscribe` |

## Database changes

Migration `prisma/migrations/20261110121125_invitations_and_onboarding_payments`. It is **additive only**: no existing table is altered or dropped.

| Table | Purpose |
|---|---|
| `InvitationCampaign` | A named batch, with its approver, approval time and the **exact count** that was approved |
| `OperatorInvitation` | One row per company and recipient: `tokenHash` (unique), status, expiry, send attempts, `lastError`, `isTest`, claim link |
| `InvitationEvent` | Append-only history: created, queued, sent, send_failed, bounced, visited, claimed, revoked, resent, unsubscribed |
| `EmailSuppression` | Addresses never to be e-mailed again (unsubscribed, hard bounce, complaint, manual) |

To reverse it: drop the four tables and the two enums. No existing data depends on them.

It has been applied to the **local** development and test databases only. It has **not** been applied to Neon production, which awaits approval.

## Security properties (each covered by a test)

| Property | How |
|---|---|
| Unique, unguessable link per company | 32 random bytes from the OS CSPRNG, base64url (`newToken`) |
| No plaintext tokens at rest | Only `sha256(token)` is stored. The raw token exists in memory for the time it takes to send. |
| Token carries nothing | No company id, e-mail or database id in the URL, so editing the URL cannot target another company |
| Bound to one company and one address | The invitation row links exactly one company and one e-mail; the claim requires a session with that exact e-mail |
| Expiry | **Links never expire by default** (owner decision, 2026-11-10; `expiresAt` is null). Revoking withdraws a link. An expiry can be reintroduced with `INVITE_EXPIRY_DAYS`, and is then checked on view, in the claim's conditional update and by a sweep. |
| Single use and no replay | The claim is `UPDATE … WHERE status IN (SENT…) AND (expiresAt IS NULL OR expiresAt > now()) AND revokedAt IS NULL`; only one request can win |
| Revocable | Staff revoke; the link then reports "withdrawn" and cannot be claimed |
| Resend kills the old link | The token hash is cleared and a new token is issued at send time |
| Mail scanners cannot consume links | GET only renders the page (it records the first visit, never changes status); claiming is a signed-in POST |
| No leakage | `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`, robots disallow; there are no third-party scripts or analytics on the page |
| No silent ownership change | A company with an active member shows "already has an account holder"; claims never grant membership by themselves |
| Free-mail or off-domain addresses | The claim is flagged in its review note for extra ownership checks |
| Test links can never claim | `isTest` invitations go only to the sender's own address (or an allowlist) and are refused at claim time |

## Sending pipeline

1. **Approval** (`invite.send`, super-admin only) requires all of:
   - `LIVE_SEND_ENABLED=true`;
   - SMTP configured, and not in capture mode;
   - `SENDER_POSTAL_ADDRESS` and `PUBLIC_APP_URL` set;
   - the typed word **SEND**;
   - the **exact recipient count** the approver saw.
2. At approval, every recipient is re-checked. Anyone no longer strictly eligible is revoked, never sent.
3. One job per invitation is queued, spaced `INVITE_SEND_INTERVAL_SECONDS` apart, with dedupe key `invitation.send:<id>:<n>`.
4. **The job** moves the invitation `QUEUED → SENDING` with a conditional update, so a duplicated or retried job does nothing. It then checks the suppression list and the daily cap (deferring an hour when the cap is reached), issues the token, sends, and records `SENT`.
5. **Failures:**
   - A hard bounce (5xx recipient) goes to `BOUNCED` and the address is suppressed. It is **never retried**.
   - Authentication, configuration or transient errors put the invitation back to `QUEUED` with `lastError`, and the job retries with exponential back-off. After 4 attempts it is marked `FAILED`.
   - A crash after the hand-off to SMTP leaves the row `SENDING`. It is **never re-sent automatically**; a sweep marks it `FAILED` with "outcome unknown" for a person to check.

## Personalisation

The e-mail is composed from facts on record only:
- company name;
- a real city when one is curated (registry addresses are **not** used, because they contain care-of personal names);
- website domain;
- the source of the address (the DGCA register, the GCAA list, or a public website);
- the number of aircraft linked to the company in public records;
- the contact's name, only when a verified public contact is named.

Phrasing varies by a stable per-company seed across two or three variants per paragraph. No sentence states anything that is not on record.

Every e-mail includes:
- why it was received;
- that claiming does not verify or publish anything;
- a "wrong person" line;
- the sender's identity and postal address;
- `List-Unsubscribe` with one-click (RFC 8058) and a mailto fallback.
