/**
 * Who may be invited, and at which address. Pure functions over data already in the database:
 * nothing is guessed or invented. Every exclusion carries a human-readable reason.
 */

export type CompanyCategory =
  | 'DIRECT_OPERATOR' // holds a regulator permit (DGCA NSOP register, GCAA approved list, recorded authorisation)
  | 'AIRCRAFT_MANAGEMENT' // management company without its own permit on record
  | 'CHARTER_BROKER' // arranges flights it does not operate
  | 'CORPORATE_FLIGHT_DEPARTMENT' // permit used for a group's own aircraft; strategic, not a charter supplier
  | 'AVIATION_SERVICES' // cargo, MRO, training, airport authorities, aerial work…
  | 'UNQUALIFIED_LEAD'; // research grade D or no evidence of aviation activity

export const CATEGORY_LABEL: Record<CompanyCategory, string> = {
  DIRECT_OPERATOR: 'Direct aircraft operator',
  AIRCRAFT_MANAGEMENT: 'Aircraft management company',
  CHARTER_BROKER: 'Charter broker',
  CORPORATE_FLIGHT_DEPARTMENT: 'Corporate flight department',
  AVIATION_SERVICES: 'Aviation services business',
  UNQUALIFIED_LEAD: 'Unqualified research lead',
};

/** Categories invited to claim a supplier profile in this campaign. */
export const INVITABLE: ReadonlySet<CompanyCategory> = new Set(['DIRECT_OPERATOR']);

export interface ContactLike {
  id: string;
  kind: 'REGULATORY' | 'COMPANY' | 'DECISION_MAKER' | 'CHARTER_SALES' | 'OPERATIONS' | 'BILLING';
  name: string | null;
  emails: string[];
  confidence: 'AUTHORITY' | 'VERIFIED_PUBLIC' | 'OPERATOR_PROVIDED' | 'RESEARCH' | 'UNVERIFIED';
  doNotContact: boolean;
  deletedAt?: Date | null;
}

export interface CompanyLike {
  id: string;
  displayName: string;
  countryCode: string;
  lifecycle: string;
  website: string | null;
  deletedAt: Date | null;
  researchOperatorKind: string | null;
  researchRelevance: string | null;
  researchCharterActivity: string | null;
  authorizationCount: number;
  activeMemberCount: number;
  openClaimCount: number;
  contacts: ContactLike[];
}

export interface EligibilityContext {
  /** Lower-case addresses that must never be emailed (unsubscribed, bounced, complaints, manual). */
  suppressed: ReadonlySet<string>;
  /** Lower-case address → number of distinct companies listing it. */
  addressCompanyCount: ReadonlyMap<string, number>;
  /** Company ids with an invitation that is still live (approved, queued, sending, sent, unexpired). */
  liveInvitation: ReadonlySet<string>;
}

export interface Recipient {
  email: string;
  name: string | null;
  contactId: string;
  source: 'CHARTER_SALES' | 'COMPANY' | 'DECISION_MAKER' | 'REGULATOR';
  confidence: ContactLike['confidence'];
  /** Free-mail provider (gmail.com…): a claim from it always goes to manual review. */
  genericDomain: boolean;
  /** The address's domain matches the company's own website domain. */
  domainMatchesWebsite: boolean;
}

export interface Eligibility {
  category: CompanyCategory;
  eligible: boolean;
  reasons: string[];
  recipient: Recipient | null;
}

const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'hotmail.com', 'outlook.com', 'live.com', 'rediffmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com', 'mail.com', 'gmx.com']);
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export const isValidEmail = (e: string) => EMAIL_RE.test(normaliseEmail(e)) && !normaliseEmail(e).includes('..');
export const emailDomain = (e: string) => normaliseEmail(e).split('@')[1] ?? '';
export const isFreeMail = (e: string) => FREE_MAIL.has(emailDomain(e));

/** "https://www.Example.co.in/about" → "example.co.in" */
export function websiteDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** True when the address is on the company's domain (including a sub-domain of it). */
export function domainMatches(email: string, website: string | null) {
  const site = websiteDomain(website);
  const d = emailDomain(email);
  return Boolean(site && d && (d === site || d.endsWith(`.${site}`) || site.endsWith(`.${d}`)));
}

export function categorise(c: Pick<CompanyLike, 'displayName' | 'lifecycle' | 'researchOperatorKind' | 'researchRelevance' | 'researchCharterActivity' | 'authorizationCount' | 'contacts'>): CompanyCategory {
  const kind = (c.researchOperatorKind ?? '').toLowerCase();
  const activity = (c.researchCharterActivity ?? '').toLowerCase();
  const name = c.displayName.toLowerCase();
  const permit = c.authorizationCount > 0 || c.researchRelevance === 'Confirmed' || c.contacts.some((x) => x.kind === 'REGULATORY' && x.confidence === 'AUTHORITY');
  if (/airports? authority/.test(name)) return 'AVIATION_SERVICES';
  if (c.researchRelevance === 'D') return 'UNQUALIFIED_LEAD';
  if (/\bcargo\b|\bmro\b|training|steam|boiler|geospatial|weather|balloon/.test(kind) && !/charter/.test(kind)) return 'AVIATION_SERVICES';
  if (/corporate aircraft|corporate aviation/.test(kind) && !/charter/.test(`${kind} ${activity}`)) return 'CORPORATE_FLIGHT_DEPARTMENT';
  if (permit) return 'DIRECT_OPERATOR';
  if (/broker/.test(kind)) return 'CHARTER_BROKER';
  if (/management/.test(kind)) return 'AIRCRAFT_MANAGEMENT';
  if (/aviation services|aerial|aerospace/.test(kind)) return 'AVIATION_SERVICES';
  return 'UNQUALIFIED_LEAD';
}

/** Lower rank = preferred. Contacts not listed here are never used for outreach. */
function rank(c: ContactLike): { rank: number; source: Recipient['source'] } | null {
  if (c.confidence === 'UNVERIFIED') return null;
  if (c.kind === 'CHARTER_SALES' && (c.confidence === 'VERIFIED_PUBLIC' || c.confidence === 'OPERATOR_PROVIDED')) return { rank: 1, source: 'CHARTER_SALES' };
  if (c.kind === 'COMPANY' && (c.confidence === 'VERIFIED_PUBLIC' || c.confidence === 'OPERATOR_PROVIDED')) return { rank: 2, source: 'COMPANY' };
  if (c.kind === 'DECISION_MAKER' && c.confidence === 'VERIFIED_PUBLIC') return { rank: 3, source: 'DECISION_MAKER' };
  if (c.kind === 'REGULATORY' && c.confidence === 'AUTHORITY') return { rank: 4, source: 'REGULATOR' };
  if (c.kind === 'COMPANY' && c.confidence === 'RESEARCH') return { rank: 5, source: 'COMPANY' }; // only on the company's own domain (checked below)
  return null; // e.g. names and addresses found only by research: never used
}

export function chooseRecipient(company: CompanyLike, ctx: EligibilityContext): { recipient: Recipient | null; rejected: string[] } {
  const rejected: string[] = [];
  const options: (Recipient & { rank: number })[] = [];
  for (const contact of company.contacts) {
    if (contact.deletedAt) continue;
    const r = rank(contact);
    if (!r) continue;
    if (contact.doNotContact) {
      rejected.push('a contact is marked do-not-contact');
      continue;
    }
    for (const raw of contact.emails) {
      const email = normaliseEmail(raw);
      if (!isValidEmail(email)) { rejected.push(`invalid address (${email})`); continue; }
      if (ctx.suppressed.has(email)) { rejected.push('address is suppressed (unsubscribed or bounced)'); continue; }
      if ((ctx.addressCompanyCount.get(email) ?? 0) > 1) { rejected.push('address is shared by several companies'); continue; }
      const matches = domainMatches(email, company.website);
      if (r.rank === 5 && !matches) { rejected.push('research address is not on the company domain'); continue; }
      const named = r.source === 'DECISION_MAKER' || r.source === 'CHARTER_SALES';
      options.push({ email, name: named && contact.name?.trim() ? contact.name.trim() : null, contactId: contact.id, source: r.source, confidence: contact.confidence, genericDomain: isFreeMail(email), domainMatchesWebsite: matches, rank: r.rank });
    }
  }
  // Prefer the best source; among equals, an address on the company's own domain.
  options.sort((a, b) => a.rank - b.rank || Number(b.domainMatchesWebsite) - Number(a.domainMatchesWebsite) || Number(a.genericDomain) - Number(b.genericDomain));
  const best = options[0];
  if (!best) return { recipient: null, rejected };
  const { rank: _r, ...recipient } = best;
  return { recipient, rejected };
}

export function assessEligibility(company: CompanyLike, ctx: EligibilityContext): Eligibility {
  const category = categorise(company);
  const reasons: string[] = [];
  if (company.deletedAt) reasons.push('record deleted');
  if (['EXCLUDED', 'REJECTED', 'SUSPENDED'].includes(company.lifecycle)) reasons.push(`company status is ${company.lifecycle.toLowerCase()}`);
  if (company.lifecycle !== 'DISCOVERED' && !reasons.length) reasons.push('profile is already claimed');
  if (!INVITABLE.has(category)) reasons.push(`${CATEGORY_LABEL[category].toLowerCase()}: not invited in this campaign`);
  if (company.activeMemberCount > 0) reasons.push('company already has an account holder');
  if (company.openClaimCount > 0) reasons.push('a claim is already in progress');
  if (ctx.liveInvitation.has(company.id)) reasons.push('already invited (invitation still live)');
  const { recipient, rejected } = chooseRecipient(company, ctx);
  if (!recipient) reasons.push(rejected.length ? `no usable business address (${[...new Set(rejected)].join('; ')})` : 'no public business e-mail on record');
  return { category, eligible: reasons.length === 0, reasons, recipient };
}
