# SMTP configuration

Status as of 2026-11-10.

## Current status

| Item | Status |
|---|---|
| SMTP account | A Gmail address with a 16-character **App Password**, set in `.env` as `SMTP_USER` / `SMTP_APP_PASSWORD`. The values are never printed or committed. |
| Connection and authentication | **Verified.** `smtp.gmail.com:465` (TLS) accepted the credentials in an authenticated handshake. **No message was sent.** |
| Real test e-mail delivered | **Not yet.** Waiting for the address you want the test sent to. |
| Live sending to companies | **Disabled.** `LIVE_SEND_ENABLED` is unset, which means false. |

E-mail delivery is **not** claimed to be working until a real test e-mail has arrived in a mailbox you control.

## Environment variables

These are server-side only. None are `NEXT_PUBLIC_*`, so none can reach the browser.

| Variable | Required | Notes |
|---|---|---|
| `SMTP_HOST` | Yes (inferred for Gmail) | `smtp.gmail.com` is used automatically when `SMTP_USER` ends in `@gmail.com` |
| `SMTP_PORT` | No (465) | 465 uses implicit TLS; 587 uses STARTTLS (TLS is then required) |
| `SMTP_SECURE` | No | Defaults to true for port 465 |
| `SMTP_USER` | Yes | The mailbox login |
| `SMTP_PASSWORD` or `SMTP_APP_PASSWORD` | Yes | Use a **restricted app password**, never the mailbox's main password. Spaces in `SMTP_APP_PASSWORD` are ignored. |
| `SMTP_FROM_NAME` | No ("ThePrivate") | |
| `SMTP_FROM_EMAIL` | No (= `SMTP_USER`) | With Gmail this **must** be the Gmail address, or an address configured under "Send mail as" |
| `SMTP_REPLY_TO` | No | Only set it to an address that can **receive** mail (see the DNS section) |
| `PUBLIC_APP_URL` | Yes for live | `https://theprivate.in`. Used for claim and unsubscribe links. |
| `SENDER_POSTAL_ADDRESS` | Yes for live | The sender's postal address, printed in every invitation footer |
| `UNSUBSCRIBE_SECRET` | Recommended | Signs unsubscribe links. Defaults to `BETTER_AUTH_SECRET`. |
| `CRON_SECRET` | Yes on Vercel | Enables `GET /api/cron/worker` (Bearer token), which delivers the queue on hosts without a worker |

**Local:** `.env` is git-ignored. The production database settings are kept separately in `.env.neon.local`, which is also ignored.

**Production (Vercel):**
1. Go to Project → Settings → Environment Variables and add the variables above to the **Production** environment only.
2. Add a Vercel Cron job (or any scheduler) calling `GET https://theprivate.in/api/cron/worker` with `Authorization: Bearer $CRON_SECRET`, roughly every minute while a campaign is sending.

## Sender-domain authentication (SPF, DKIM, DMARC)

Checked with live DNS lookups on 2026-11-10:

| Record | theprivate.in | gmail.com |
|---|---|---|
| MX (can receive mail) | **None** | Yes |
| SPF | **None** | Yes |
| DKIM (common selectors) | **None found** | Signed by Google |
| DMARC | `p=quarantine`, relaxed alignment | `p=none` |

**What this means:**
- **Sending from the Gmail address works today.** Gmail signs the mail (DKIM) and its SPF authorises the send, so it passes authentication.
- **Do not send "From: @theprivate.in" yet.** Without SPF or DKIM, theprivate.in's own DMARC policy (`quarantine`) sends such mail to spam.
- **Do not set Reply-To to @theprivate.in yet.** The domain has no MX record, so replies would bounce.

## Recommendation before a real campaign

For a B2B campaign to about 100 companies, a personal Gmail account has practical risks:
- Daily sending limits.
- Lower trust when outreach arrives from a free-mail address.
- The possibility of account restrictions.

The recommended set-up, which I can't do because these are your accounts and DNS:
1. Create a mailbox on the domain, for example `partners@theprivate.in`, with Google Workspace, Zoho or Microsoft 365.
2. Add the provider's **MX**, **SPF** (`v=spf1 include:<provider> ~all`) and **DKIM** records for theprivate.in.
3. Keep DMARC at `p=quarantine` and check the reports at `rua`.
4. Generate an **app password** (or SMTP credential) for that mailbox and set `SMTP_USER`, `SMTP_FROM_EMAIL` and `SMTP_REPLY_TO` to it.
5. Send a test, then check the message headers show `spf=pass`, `dkim=pass` and `dmarc=pass`.

Until then, the system works with the Gmail account, at the pace set by `INVITE_SEND_INTERVAL_SECONDS` and `INVITE_DAILY_CAP` (80 per 24 hours by default).

## How credentials are protected

- They're read only in `src/server/email/mailer.ts`, which is a `server-only` module.
- The nodemailer logger and debug output are off. Errors are reduced to a category and an SMTP code before logging, so server replies that could echo account details are never logged or shown.
- `mailerStatus()`, which feeds the admin page, returns the host, port, From and which variables are missing. It never returns the password.
- `.env`, `.env.local`, `.env.*.local` and the Neon `.env.neon.local` are all git-ignored. A secret scan of the repository found none committed.
