import { describe, expect, it } from 'vitest';
import { composeInvitation, whyReceiving, type InvitationFacts } from '@/domain/invitations/compose';
import { assessEligibility, categorise, chooseRecipient, domainMatches, type CompanyLike, type ContactLike } from '@/domain/invitations/eligibility';

process.env.BETTER_AUTH_SECRET ??= 'unit-test-secret-0123456789abcdef';
const { hashToken, looksLikeToken, newToken, readUnsubscribe, unsubscribeParams } = await import('@/server/invitations/tokens');
const { classify } = await import('@/server/email/mailer');

const contact = (o: Partial<ContactLike>): ContactLike => ({ id: Math.random().toString(36).slice(2), kind: 'COMPANY', name: null, emails: [], confidence: 'VERIFIED_PUBLIC', doNotContact: false, ...o });
const company = (o: Partial<CompanyLike> = {}): CompanyLike => ({
  id: 'op1', displayName: 'Skyline Aviation Pvt. Ltd.', countryCode: 'IN', lifecycle: 'DISCOVERED', website: 'https://www.skyline.aero', deletedAt: null,
  researchOperatorKind: 'Private charter', researchRelevance: 'A', researchCharterActivity: 'Yes — private charter', authorizationCount: 0, activeMemberCount: 0, openClaimCount: 0,
  contacts: [contact({ kind: 'REGULATORY', confidence: 'AUTHORITY', emails: ['ops@skyline.aero'] })], ...o,
});
const ctx = { suppressed: new Set<string>(), addressCompanyCount: new Map<string, number>(), liveInvitation: new Set<string>() };

describe('company categories (from real research fields, no guessing)', () => {
  it('treats regulator permit holders as direct operators', () => expect(categorise(company())).toBe('DIRECT_OPERATOR'));
  it('never invites airport authorities, cargo, MRO or grade-D leads', () => {
    expect(categorise(company({ displayName: 'Airports Authority of India' }))).toBe('AVIATION_SERVICES');
    expect(categorise(company({ researchOperatorKind: 'Cargo', researchRelevance: 'B' }))).toBe('AVIATION_SERVICES');
    expect(categorise(company({ researchRelevance: 'D' }))).toBe('UNQUALIFIED_LEAD');
  });
  it('separates corporate flight departments, brokers and management firms', () => {
    expect(categorise(company({ researchOperatorKind: 'Corporate aircraft', researchCharterActivity: 'Corporate aviation' }))).toBe('CORPORATE_FLIGHT_DEPARTMENT');
    expect(categorise(company({ contacts: [], researchOperatorKind: 'Charter broker' }))).toBe('CHARTER_BROKER');
    expect(categorise(company({ contacts: [], researchOperatorKind: 'Aircraft management' }))).toBe('AIRCRAFT_MANAGEMENT');
  });
});

describe('recipient choice', () => {
  it('prefers a public charter-sales address over the regulator address', () => {
    const c = company({ contacts: [contact({ kind: 'REGULATORY', confidence: 'AUTHORITY', emails: ['reg@skyline.aero'] }), contact({ kind: 'CHARTER_SALES', name: 'Asha Rao', emails: ['charter@skyline.aero'] })] });
    const r = chooseRecipient(c, ctx).recipient!;
    expect(r.email).toBe('charter@skyline.aero');
    expect(r.name).toBe('Asha Rao');
  });
  it('never uses names or addresses found only by research', () => {
    const c = company({ contacts: [contact({ kind: 'DECISION_MAKER', confidence: 'RESEARCH', name: 'Guessed Person', emails: ['guessed@skyline.aero'] })] });
    expect(chooseRecipient(c, ctx).recipient).toBeNull();
  });
  it('uses a research company address only on the company domain', () => {
    expect(chooseRecipient(company({ contacts: [contact({ confidence: 'RESEARCH', emails: ['info@other.com'] })] }), ctx).recipient).toBeNull();
    expect(chooseRecipient(company({ contacts: [contact({ confidence: 'RESEARCH', emails: ['info@skyline.aero'] })] }), ctx).recipient?.email).toBe('info@skyline.aero');
  });
  it('excludes suppressed, shared, invalid and do-not-contact addresses', () => {
    const base = company();
    expect(chooseRecipient(base, { ...ctx, suppressed: new Set(['ops@skyline.aero']) }).recipient).toBeNull();
    expect(chooseRecipient(base, { ...ctx, addressCompanyCount: new Map([['ops@skyline.aero', 2]]) }).recipient).toBeNull();
    expect(chooseRecipient(company({ contacts: [contact({ kind: 'REGULATORY', confidence: 'AUTHORITY', emails: ['not-an-email'] })] }), ctx).recipient).toBeNull();
    expect(chooseRecipient(company({ contacts: [contact({ kind: 'REGULATORY', confidence: 'AUTHORITY', emails: ['ops@skyline.aero'], doNotContact: true })] }), ctx).recipient).toBeNull();
  });
  it('flags free-mail addresses for manual claim review', () => {
    const r = chooseRecipient(company({ contacts: [contact({ kind: 'REGULATORY', confidence: 'AUTHORITY', emails: ['skyline.ops@gmail.com'] })] }), ctx).recipient!;
    expect(r.genericDomain).toBe(true);
    expect(domainMatches('a@ops.skyline.aero', 'skyline.aero')).toBe(true);
  });
});

describe('eligibility', () => {
  it('is eligible only for an unclaimed direct operator with a usable address', () => {
    expect(assessEligibility(company(), ctx).eligible).toBe(true);
    expect(assessEligibility(company({ activeMemberCount: 1 }), ctx).reasons.join()).toMatch(/account holder/);
    expect(assessEligibility(company({ openClaimCount: 1 }), ctx).reasons.join()).toMatch(/claim is already in progress/);
    expect(assessEligibility(company(), { ...ctx, liveInvitation: new Set(['op1']) }).reasons.join()).toMatch(/already invited/);
    expect(assessEligibility(company({ lifecycle: 'EXCLUDED' }), ctx).eligible).toBe(false);
  });
});

const facts = (o: Partial<InvitationFacts> = {}): InvitationFacts => ({ companyName: 'Skyline Aviation Pvt. Ltd.', countryCode: 'IN', place: null, websiteDomain: 'skyline.aero', source: 'REGULATOR', publicAircraftCount: 0, recipientName: null, recipientEmail: 'ops@skyline.aero', ...o });
const links = { claimUrl: 'https://theprivate.in/claim/TOKEN', unsubscribeUrl: 'https://theprivate.in/unsubscribe?e=x&s=y', expiresAt: new Date('2026-12-01T00:00:00Z'), appUrl: 'https://theprivate.in' };
const sender = { name: 'ThePrivate', postalAddress: 'ThePrivate, 1 Example Road, Mumbai', replyTo: null };

describe('personalised invitation', () => {
  it('uses the company name, a company greeting when no name is known, and the real source', () => {
    const m = composeInvitation(facts(), links, sender);
    expect(m.subject).toContain('Skyline Aviation Pvt. Ltd.');
    expect(m.text).toMatch(/^Hello Skyline Aviation Pvt\. Ltd\. team,/);
    expect(m.text).toContain("DGCA's published list of non-scheduled operator permit holders");
  });
  it('greets a known public contact by name and never invents fleet facts', () => {
    const named = composeInvitation(facts({ recipientName: 'Asha Rao', source: 'CHARTER_SALES' }), links, sender);
    expect(named.text).toMatch(/^Dear Asha Rao,/);
    expect(named.text).not.toMatch(/aircraft linked/);
    expect(composeInvitation(facts({ publicAircraftCount: 3 }), links, sender).text).toContain('3 aircraft linked to Skyline');
  });
  it('states why it was received, that claiming is not verification, expiry, sender and unsubscribe', () => {
    const m = composeInvitation(facts(), links, sender);
    expect(m.text).toContain(whyReceiving(facts()));
    expect(m.text).toMatch(/does not verify or publish/);
    expect(m.text).toContain('expires on 1 December 2026');
    expect(m.text).toContain('ThePrivate, 1 Example Road, Mumbai');
    expect(m.text).toContain(links.unsubscribeUrl);
    expect(m.html).toContain('href="https://theprivate.in/claim/TOKEN"');
  });
  it('varies phrasing between companies but is stable for one company', () => {
    const a = composeInvitation(facts(), links, sender).text;
    expect(composeInvitation(facts(), links, sender).text).toBe(a);
    const variants = new Set(['Alpha Air', 'Beta Jets', 'Gamma Wings', 'Delta Charter', 'Epsilon Aviation', 'Zeta Air'].map((n) => composeInvitation(facts({ companyName: n }), links, sender).text.split('\n')[2]));
    expect(variants.size).toBeGreaterThan(1);
  });
  it('escapes HTML in company names', () => {
    expect(composeInvitation(facts({ companyName: '<script>x</script>' }), links, sender).html).not.toContain('<script>');
  });
});

describe('tokens', () => {
  it('are 256-bit, unique, unpredictable and stored only as a hash', () => {
    const a = newToken();
    const b = newToken();
    expect(a.raw).not.toBe(b.raw);
    expect(looksLikeToken(a.raw)).toBe(true);
    expect(a.hash).toBe(hashToken(a.raw));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.raw);
    expect(looksLikeToken("cl0xxxx' OR 1=1")).toBe(false);
  });
  it('signs unsubscribe links and rejects tampering', () => {
    const p = unsubscribeParams('Ops@Skyline.aero');
    expect(readUnsubscribe(p.e, p.s)).toBe('ops@skyline.aero');
    const other = unsubscribeParams('victim@other.com');
    expect(readUnsubscribe(other.e, p.s)).toBeNull();
    expect(readUnsubscribe(p.e, `${p.s.slice(0, -1)}A`)).toBeNull();
  });
});

describe('SMTP error classification', () => {
  it('suppresses only true recipient rejections and never blames recipients for auth failures', () => {
    expect(classify({ responseCode: 550, command: 'RCPT TO' }).kind).toBe('HARD_BOUNCE');
    expect(classify({ code: 'EAUTH', responseCode: 535 }).kind).toBe('AUTH');
    expect(classify({ responseCode: 451 }).kind).toBe('TRANSIENT');
    expect(classify({ code: 'ETIMEDOUT' }).kind).toBe('TRANSIENT');
  });
});
