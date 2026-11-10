/**
 * Writes one company's invitation from facts we hold about it, and nothing else.
 * Phrasing varies per company (a stable seed) so messages read as written, not merged.
 * Every sentence below is either fixed copy about ThePrivate or a fact passed in.
 */

export interface InvitationFacts {
  companyName: string;
  countryCode: string; // 'IN' | 'AE' | …
  /** City or base, only when present in the record. */
  place: string | null;
  websiteDomain: string | null;
  /** Where the business address came from. */
  source: 'CHARTER_SALES' | 'COMPANY' | 'DECISION_MAKER' | 'REGULATOR';
  /** Aircraft associated with the company in public records (0 if none). */
  publicAircraftCount: number;
  recipientName: string | null;
  recipientEmail: string;
}

export interface InvitationLinks {
  claimUrl: string;
  unsubscribeUrl: string;
  expiresAt: Date;
  appUrl: string; // https://theprivate.in
}

export interface SenderIdentity {
  name: string; // "ThePrivate"
  postalAddress: string | null; // required before live sending (see INVITATION_CAMPAIGN_GUIDE.md)
  replyTo: string | null;
}

export interface ComposedEmail {
  subject: string;
  text: string;
  html: string;
}

const COUNTRY: Record<string, string> = { IN: 'India', AE: 'the UAE' };

/** Stable 32-bit FNV-1a hash → variant picker. */
function seed(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const pick = <T,>(arr: readonly T[], s: number, salt: number) => arr[(s >>> salt) % arr.length]!;

function registerPhrase(countryCode: string) {
  if (countryCode === 'IN') return "the DGCA's published list of non-scheduled operator permit holders";
  if (countryCode === 'AE') return "the GCAA's published list of approved air operators";
  return 'public aviation records';
}

export function whyReceiving(f: InvitationFacts) {
  const where = f.source === 'REGULATOR' ? registerPhrase(f.countryCode) : f.websiteDomain ? `the public website ${f.websiteDomain}` : 'public business listings';
  return `You are receiving this because ${f.recipientEmail} is listed as a business contact for ${f.companyName} in ${where}.`;
}

export function composeInvitation(f: InvitationFacts, links: InvitationLinks, sender: SenderIdentity): ComposedEmail {
  const s = seed(f.companyName + f.recipientEmail);
  const name = f.companyName;
  const greeting = f.recipientName ? `Dear ${f.recipientName},` : `Hello ${name} team,`;
  const region = COUNTRY[f.countryCode];

  const intro = pick(
    [
      `We are building ThePrivate, a private aviation platform that makes discovering and arranging private flights simpler for travellers${region ? ` in ${region} and beyond` : ''}.`,
      `I'm writing from ThePrivate, a new private aviation platform built to make private flights simpler to discover and arrange${region ? `, starting with ${region}` : ''}.`,
    ],
    s,
    0,
  );

  // A location is mentioned only when a real city/base is on record (never just the country).
  const based = f.place ? `, based in ${f.place},` : '';
  const prepared =
    f.source === 'REGULATOR'
      ? pick(
          [
            `${name}${based} appears on ${registerPhrase(f.countryCode)}, so we have prepared an initial company profile for you from that public record.`,
            `Because ${name}${based} appears on ${registerPhrase(f.countryCode)}, we have set up an initial profile for your company from that public record.`,
          ],
          s,
          3,
        )
      : pick(
          [
            `We have prepared an initial company profile for ${name}${based ? based.slice(0, -1) : ''} from publicly available information${f.websiteDomain ? `, including ${f.websiteDomain}` : ''}.`,
            `Using publicly available information${f.websiteDomain ? `, including ${f.websiteDomain}` : ''}, we have set up an initial profile for ${name}${based ? based.slice(0, -1) : ''}.`,
          ],
          s,
          3,
        );
  const fleet =
    f.publicAircraftCount > 0
      ? ` It currently shows ${f.publicAircraftCount} aircraft linked to ${name} in public records, which your team can confirm or correct.`
      : '';

  const ask = pick(
    [
      `We would like to invite your team to review those details, correct anything that is out of date, and claim the profile.`,
      `Your team is welcome to review the profile, correct anything that has changed, and claim it as yours.`,
    ],
    s,
    6,
  );

  const after = `Once claimed, you can open your company workspace, update your information and begin onboarding. Receiving this invitation does not verify or publish your profile: you stay in control of what you submit, and our team reviews the required details before anything is activated.`;

  const expires = links.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const linkNote = `This link is personal to ${name} and expires on ${expires}.`;
  const wrong = pick(
    [`If this has reached the wrong person, just reply and let us know.`, `If you are not the right person for this, a quick reply telling us so is very welcome.`],
    s,
    9,
  );
  const signoff = pick(['Kind regards,', 'With best regards,', 'Regards,'], s, 12);

  const subject = pick([`An invitation for ${name} to join ThePrivate`, `${name}: your company profile on ThePrivate`], s, 15);

  const footerLines = [
    `ThePrivate · ${links.appUrl}`,
    sender.postalAddress,
    whyReceiving(f),
    `To stop receiving these e-mails, unsubscribe: ${links.unsubscribeUrl}`,
  ].filter(Boolean) as string[];

  const text = [
    greeting,
    '',
    intro,
    '',
    `${prepared}${fleet}`,
    '',
    ask,
    '',
    after,
    '',
    `Review and claim your company profile:`,
    links.claimUrl,
    '',
    linkNote,
    '',
    wrong,
    '',
    signoff,
    sender.name,
    links.appUrl,
    '',
    '—',
    ...footerLines,
  ].join('\n');

  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const p = (v: string) => `<p style="margin:0 0 16px">${esc(v)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f0e8;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#111518">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:36px 32px;border-radius:4px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b3137">
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:#111518"><em>The</em>Private</p>
${p(greeting)}${p(intro)}${p(`${prepared}${fleet}`)}${p(ask)}${p(after)}
<p style="margin:28px 0"><a href="${esc(links.claimUrl)}" style="background:#a3245c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">Review and claim your company profile</a></p>
<p style="margin:0 0 16px;font-size:13px;color:#646a71">${esc(linkNote)}</p>
${p(wrong)}<p style="margin:0">${esc(signoff)}<br>${esc(sender.name)}<br><a href="${esc(links.appUrl)}" style="color:#2e5578">${esc(links.appUrl.replace(/^https?:\/\//, ''))}</a></p>
</div>
<div style="max-width:560px;margin:16px auto 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#646a71">
${footerLines.slice(0, -1).map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join('')}
<p style="margin:0"><a href="${esc(links.unsubscribeUrl)}" style="color:#646a71">Unsubscribe</a> from ThePrivate company invitations.</p>
</div></body></html>`;

  return { subject, text, html };
}
