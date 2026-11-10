# Invitation campaign guide

## The rule

Nothing reaches a real company until **you** approve it in the admin console. That requires the super-admin permission, `LIVE_SEND_ENABLED=true` in production, the exact recipient count, and typing **SEND**. During development, `LIVE_SEND_ENABLED` is off.

## Dry run (done 2026-11-10, local data)

Run `npm run invitations:manifest`. It sends nothing and writes nothing to the database. Its output goes to `reports/invitations/`, which is git-ignored because it contains business addresses:
- `manifest-<date>.csv`: every company, with category, chosen address, source, confidence, flags and reasons;
- `summary-<date>.json`: the counts below;
- `samples-<date>.txt`: personalised samples.

| | Count |
|---|---|
| Companies on record | 149 |
| **Eligible** | **107**: India 96, UAE 11 |
| …address from the regulator's register (DGCA NSOP) | 96 |
| …verified company address | 6 |
| …verified charter-sales address | 5 |
| …free-mail address (claim will be reviewed manually) | 8 |
| …greeted by name | 0. No verified public contact names exist, so all use "Hello <Company> team". |
| **Not eligible** | **42** |
| …corporate flight departments (permit used for own aircraft) | 22 |
| …no public business e-mail on record | 12 |
| …unqualified research leads (grade D) | 8 |
| …no usable address (shared by several companies, research-only, invalid) | 4 |
| …a claim already in progress | 1 |
| …aviation services business | 1 |
| Suppressed addresses | 0 |

**Categories on record:**
- Direct aircraft operator: 118
- Corporate flight department: 22
- Unqualified research lead: 8
- Aviation services: 1

Brokers and management-only companies are categorised separately if present; none are on record without a regulator permit.

**Production (Neon), 2026-11-10:** the import was applied there with 149 companies.
- **Eligible:** 108 (India 97, UAE 11).
  - Sources: regulator 97, company 6, charter sales 5.
  - Free-mail addresses: 9.
- **Not eligible:** 41.

The one-company difference from the local counts is a company whose claim exists only in the local database. Re-run `npm run invitations:manifest` against production immediately before approving a campaign.

## Sample messages

Recipient local parts are redacted here.

> **To:** •••@cluboneair.com · **Subject:** An invitation for AR Airways Pvt. Ltd. to join ThePrivate
>
> Hello AR Airways Pvt. Ltd. team,
>
> We are building ThePrivate, a private aviation platform that makes discovering and arranging private flights simpler for travellers in India and beyond.
>
> AR Airways Pvt. Ltd. appears on the DGCA's published list of non-scheduled operator permit holders, so we have prepared an initial company profile for you from that public record. It currently shows 7 aircraft linked to AR Airways Pvt. Ltd. in public records, which your team can confirm or correct.
>
> Your team is welcome to review the profile, correct anything that has changed, and claim it as yours.
>
> Once claimed, you can open your company workspace, update your information and begin onboarding. Receiving this invitation does not verify or publish your profile: you stay in control of what you submit, and our team reviews the required details before anything is activated.
>
> Review and claim your company profile: *(unique link)*
> This link is personal to AR Airways Pvt. Ltd.
>
> If this has reached the wrong person, just reply and let us know.
>
> With best regards, ThePrivate · https://theprivate.in
>
> — *(postal address)* · You are receiving this because ••• is listed as a business contact for AR Airways Pvt. Ltd. in the DGCA's published list of non-scheduled operator permit holders. · Unsubscribe link

> **To:** •••@ada.ae · **Subject:** Abu Dhabi Aviation: your company profile on ThePrivate
>
> Hello Abu Dhabi Aviation team, … Using publicly available information, including ada.ae, we have set up an initial profile for Abu Dhabi Aviation, based in Abu Dhabi. … *(same structure; different wording variants)*

All samples are in `reports/invitations/samples-<date>.txt`. The exact HTML of any company's e-mail is at **Admin → Invitations → Preview**.

## Step by step

1. **Configure:** the SMTP variables and sender identification (`SMTP_CONFIGURATION.md`). Set `SENDER_POSTAL_ADDRESS`.
2. **Production data:** approve the operator import into Neon, apply the database migration to Neon, then run the manifest against production.
3. **Review:** go to Admin → Invitations. Filter, open any company's preview, and check the address, source and reasons.
4. **Test:** press "Send test e-mail" on a preview. It goes **only** to your own address, marked [TEST]. Check rendering, sender, links, the unsubscribe link, and the headers (`spf/dkim/dmarc=pass`). Test links open the invitation page but can never claim.
5. **Prepare:** select companies, then "Prepare campaign from selected". This creates a draft only.
6. **Approve:** on the campaign page, check the recipient count, country split and the three rendered samples. Type SEND. *(Super admin; `LIVE_SEND_ENABLED=true` only after your explicit go-ahead.)*
7. **Deliver:** the worker or cron sends one invitation every 45 s, at most 80 in 24 hours. Watch statuses on the campaign page and export the CSV at any time.
8. **Follow up:**
   - Claims appear in Admin → Claims, with an evidence note.
   - Expired invitations can be re-sent, which issues a new link.
   - Bounced addresses are suppressed automatically.
   - Unsubscribes are honoured immediately.

## Handling replies, bounces and complaints

- **Replies** go to the From/Reply-To mailbox. If someone says "wrong person" or "stop", add their address under suppression (reason MANUAL) through the admin action.
- **Synchronous bounces** (SMTP 5xx at send time) are suppressed automatically.
- **Asynchronous bounces** arrive later as bounce e-mails in the sending mailbox. Add those addresses to suppression (reason HARD_BOUNCE). A provider webhook can automate this later.
- **Complaints:** suppress the address (reason COMPLAINT).

## Regional notes

Business-to-business outreach to publicly listed business contacts. Each message:
- identifies the sender and a postal address;
- explains why it was received;
- offers a working one-click unsubscribe, honoured immediately and permanently.

No tracking pixels are used. No personal data beyond the public business contact is processed for this campaign. Before a large send, have counsel confirm the position under India's DPDP Act and UAE PDPL for B2B outreach.
