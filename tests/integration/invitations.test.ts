/**
 * Company invitations against a real PostgreSQL (*_test database). SMTP uses the capture
 * transport: no e-mail leaves the machine.
 */
import { existsSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL!);
if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`;
process.env.DATABASE_URL = url.toString();
delete process.env.DATABASE_URL_UNPOOLED;
Object.assign(process.env, { SMTP_TRANSPORT: 'capture', PUBLIC_APP_URL: 'https://theprivate.in', SENDER_POSTAL_ADDRESS: 'ThePrivate, Test Address, Mumbai', INVITE_SEND_INTERVAL_SECONDS: '0', BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'test-secret-0123456789abcdef0123' });

let prisma: typeof import('@/server/db/client').prisma;
let svc: typeof import('@/server/invitations/service');
let mailer: typeof import('@/server/email/mailer');
let permissionsFor: typeof import('@/server/auth/permissions').permissionsFor;
type Viewer = Parameters<typeof import('@/server/invitations/service').createCampaign>[0];

const tag = Date.now().toString(36);
const viewerOf = (user: { id: string; email: string; name: string }, roles: string[] = []) => ({ user, roles, permissions: permissionsFor(roles as never), memberships: [], isStaff: roles.length > 0 }) as unknown as Viewer;

async function company(n: string, email: string, opts: { website?: string } = {}) {
  const op = await prisma.operator.create({ data: { slug: `inv-${n}-${tag}`, legalName: `Inv ${n} ${tag}`, displayName: `Inv ${n} ${tag}`, countryCode: 'IN', website: opts.website ?? `https://inv${n}${tag}.example`, researchRelevance: 'A', researchOperatorKind: 'Private charter' } });
  await prisma.operatorContact.create({ data: { operatorId: op.id, kind: 'REGULATORY', confidence: 'AUTHORITY', emails: [email] } });
  return op;
}

async function sendOne(operatorId: string, admin: Viewer) {
  const { campaign } = await svc.createCampaign(admin, { name: `t ${tag}`, operatorIds: [operatorId] });
  await svc.approveAndQueueCampaign(admin, campaign.id, 1);
  const inv = await prisma.operatorInvitation.findFirstOrThrow({ where: { campaignId: campaign.id } });
  const before = mailer.captured.length;
  await svc.processInvitationJob(inv.id);
  const mail = mailer.captured[before]!;
  const token = /\/claim\/([A-Za-z0-9_-]{43})/.exec(mail.text)![1]!;
  return { inv, mail, token };
}

describe('company invitations (test database)', () => {
  let admin: Viewer;
  let supply: Viewer;
  beforeAll(async () => {
    ({ prisma } = await import('@/server/db/client'));
    svc = await import('@/server/invitations/service');
    mailer = await import('@/server/email/mailer');
    ({ permissionsFor } = await import('@/server/auth/permissions'));
    const a = await prisma.user.create({ data: { email: `admin-${tag}@t.dev`, name: 'Admin' } });
    const s = await prisma.user.create({ data: { email: `supply-${tag}@t.dev`, name: 'Supply' } });
    admin = viewerOf(a, ['SUPER_ADMIN']);
    supply = viewerOf(s, ['SUPPLY']);
  });
  beforeEach(() => {
    process.env.LIVE_SEND_ENABLED = 'true';
  });

  it('refuses live sending while LIVE_SEND_ENABLED is off (the safe default)', async () => {
    process.env.LIVE_SEND_ENABLED = 'false';
    const op = await company('a', `ops-a-${tag}@inva${tag}.example`);
    const { campaign } = await svc.createCampaign(admin, { name: 'blocked', operatorIds: [op.id] });
    await expect(svc.approveAndQueueCampaign(admin, campaign.id, 1)).rejects.toThrow(/LIVE_SEND_ENABLED/);
    expect(await prisma.operatorInvitation.count({ where: { campaignId: campaign.id, status: 'QUEUED' } })).toBe(0);
  });

  it('requires the exact recipient count and the send permission', async () => {
    const op = await company('b', `ops-b-${tag}@invb${tag}.example`);
    const { campaign } = await svc.createCampaign(supply, { name: 'perm', operatorIds: [op.id] });
    await expect(svc.approveAndQueueCampaign(supply, campaign.id, 1)).rejects.toThrow(/Not allowed/);
    await expect(svc.approveAndQueueCampaign(admin, campaign.id, 2)).rejects.toThrow(/now has 1 recipients/);
    const nobody = viewerOf(await prisma.user.create({ data: { email: `x-${tag}@t.dev`, name: 'X' } }));
    await expect(svc.createCampaign(nobody, { name: 'nope', operatorIds: [op.id] })).rejects.toThrow(/Not allowed/);
  });

  it('sends one personalised e-mail per company, never twice on a retried job', async () => {
    const op = await company('c', `ops-c-${tag}@invc${tag}.example`);
    const { inv, mail } = await sendOne(op.id, admin);
    expect(mail.to).toBe(`ops-c-${tag}@invc${tag}.example`);
    expect(mail.text).toContain(op.displayName);
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const row = await prisma.operatorInvitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(row.status).toBe('SENT');
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const count = mailer.captured.length;
    await svc.processInvitationJob(inv.id); // a duplicated / retried job
    expect(mailer.captured.length).toBe(count);
    // the company cannot be put in a second live campaign
    const again = await svc.createCampaign(admin, { name: 'dup', operatorIds: [op.id] }).catch((e: Error) => e);
    expect(again).toBeInstanceOf(Error);
  });

  it('never consumes the link on GET, and lets only the invited address claim, exactly once', async () => {
    const email = `ops-d-${tag}@invd${tag}.example`;
    const op = await company('d', email);
    const { token, inv } = await sendOne(op.id, admin);
    expect((await svc.viewInvitation(token)).state).toBe('valid');
    expect((await svc.viewInvitation(token)).state).toBe('valid'); // scanners can open it repeatedly
    const stranger = viewerOf(await prisma.user.create({ data: { email: `stranger-${tag}@evil.example`, name: 'Stranger' } }));
    await expect(svc.claimViaInvitation(stranger, { token, claimantRole: 'Director', authorised: 'yes' })).rejects.toThrow(/Sign in with the e-mail address/);
    const owner = viewerOf(await prisma.user.create({ data: { email, name: 'Owner' } }));
    await expect(svc.claimViaInvitation(owner, { token, claimantRole: 'Director' })).rejects.toThrow(); // explicit authorisation required
    const claim = await svc.claimViaInvitation(owner, { token, claimantRole: 'Director', authorised: 'yes' });
    expect(claim.status).toBe('SUBMITTED'); // a claim is a request: staff still review it
    expect(claim.operatorId).toBe(op.id);
    expect(await prisma.operatorMembership.count({ where: { operatorId: op.id } })).toBe(0);
    expect((await prisma.operator.findUniqueOrThrow({ where: { id: op.id } })).lifecycle).toBe('DISCOVERED'); // not verified
    expect((await prisma.operatorInvitation.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe('CLAIMED');
    await expect(svc.claimViaInvitation(owner, { token, claimantRole: 'Director', authorised: 'yes' })).rejects.toThrow(/already been used or has been withdrawn/); // replay
  });

  it("binds a link to its own company: one company's token can never claim another", async () => {
    const e1 = `ops-e-${tag}@inve${tag}.example`;
    const e2 = `ops-f-${tag}@invf${tag}.example`;
    const c1 = await company('e', e1);
    const c2 = await company('f', e2);
    const t1 = (await sendOne(c1.id, admin)).token;
    await sendOne(c2.id, admin);
    const u2 = viewerOf(await prisma.user.create({ data: { email: e2, name: 'Two' } }));
    // the holder of company 2's address cannot use company 1's link
    await expect(svc.claimViaInvitation(u2, { token: t1, claimantRole: 'CEO', authorised: 'yes' })).rejects.toThrow(/Sign in with the e-mail address/);
    expect((await svc.viewInvitation(t1)).state === 'valid' && (await svc.viewInvitation(t1)).state).toBeTruthy();
    expect((await svc.viewInvitation('A'.repeat(43))).state).toBe('invalid'); // guessed tokens find nothing
    expect((await svc.viewInvitation('../../etc/passwd')).state).toBe('invalid');
  });

  it('refuses expired, revoked and test links', async () => {
    const email = `ops-g-${tag}@invg${tag}.example`;
    const op = await company('g', email);
    const { token, inv } = await sendOne(op.id, admin);
    const user = viewerOf(await prisma.user.create({ data: { email, name: 'G' } }));
    // By default links never expire; an explicit expiry (INVITE_EXPIRY_DAYS) is still honoured.
    expect((await prisma.operatorInvitation.findUniqueOrThrow({ where: { id: inv.id } })).expiresAt).toBeNull();
    expect((await svc.viewInvitation(token)).state).toBe('valid');
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await svc.viewInvitation(token)).state).toBe('expired');
    await expect(svc.claimViaInvitation(user, { token, claimantRole: 'CEO', authorised: 'yes' })).rejects.toThrow();
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() + 86_400_000) } });
    await svc.revokeInvitation(admin, inv.id, 'test');
    expect((await svc.viewInvitation(token)).state).toBe('revoked');
    await expect(svc.claimViaInvitation(user, { token, claimantRole: 'CEO', authorised: 'yes' })).rejects.toThrow();

    const op2 = await company('h', `ops-h-${tag}@invh${tag}.example`);
    const r = await svc.sendTestInvitation(admin, op2.id, admin.user.email);
    const testToken = /\/claim\/([A-Za-z0-9_-]{43})/.exec(r.claimUrl)![1]!;
    expect((await svc.viewInvitation(testToken)).state).toBe('test');
    await expect(svc.claimViaInvitation(admin, { token: testToken, claimantRole: 'Director', authorised: 'yes' })).rejects.toThrow(/test invitation/);
    await expect(svc.sendTestInvitation(admin, op2.id, 'someone-else@example.com')).rejects.toThrow(/your own address/);
  });

  it('re-sends with a new link and kills the old one', async () => {
    const op = await company('i', `ops-i-${tag}@invi${tag}.example`);
    const { token, inv } = await sendOne(op.id, admin);
    await svc.resendInvitation(admin, inv.id);
    expect((await svc.viewInvitation(token)).state).toBe('invalid');
    const before = mailer.captured.length;
    await svc.processInvitationJob(inv.id);
    const fresh = /\/claim\/([A-Za-z0-9_-]{43})/.exec(mailer.captured[before]!.text)![1]!;
    expect(fresh).not.toBe(token);
    expect((await svc.viewInvitation(fresh)).state).toBe('valid');
  });

  it('honours unsubscribes and suppresses hard bounces', async () => {
    const email = `ops-j-${tag}@invj${tag}.example`;
    const op = await company('j', email);
    await svc.suppress(email, 'UNSUBSCRIBED', 'test');
    const c = (await svc.listCandidates()).find((x) => x.operatorId === op.id)!;
    expect(c.eligibility.eligible).toBe(false);
    expect(c.eligibility.reasons.join()).toMatch(/suppressed/);
  });

  it('puts an invitation back and records the error when SMTP fails (no silent loss)', async () => {
    const op = await company('k', `ops-k-${tag}@invk${tag}.example`);
    const { campaign } = await svc.createCampaign(admin, { name: 'fail', operatorIds: [op.id] });
    await svc.approveAndQueueCampaign(admin, campaign.id, 1);
    const inv = await prisma.operatorInvitation.findFirstOrThrow({ where: { campaignId: campaign.id } });
    const saved = { t: process.env.SMTP_TRANSPORT, u: process.env.SMTP_USER, p: process.env.SMTP_PASSWORD, a: process.env.SMTP_APP_PASSWORD };
    delete process.env.SMTP_TRANSPORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_APP_PASSWORD;
    await expect(svc.processInvitationJob(inv.id)).rejects.toThrow(/not configured/);
    Object.assign(process.env, { SMTP_TRANSPORT: saved.t }, saved.u ? { SMTP_USER: saved.u } : {}, saved.p ? { SMTP_PASSWORD: saved.p } : {}, saved.a ? { SMTP_APP_PASSWORD: saved.a } : {});
    const row = await prisma.operatorInvitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(row.status).toBe('QUEUED');
    expect(row.tokenHash).toBeNull();
    expect(row.lastError).toMatch(/not configured/);
  });

  it('shows a company that already has an account holder as unavailable', async () => {
    const email = `ops-l-${tag}@invl${tag}.example`;
    const op = await company('l', email);
    const { token } = await sendOne(op.id, admin);
    const member = await prisma.user.create({ data: { email: `m-${tag}@invl${tag}.example`, name: 'M' } });
    await prisma.operatorMembership.create({ data: { operatorId: op.id, userId: member.id, role: 'OWNER', status: 'ACTIVE' } });
    expect((await svc.viewInvitation(token)).state).toBe('has_owner');
    const invited = viewerOf(await prisma.user.create({ data: { email, name: 'L' } }));
    await expect(svc.claimViaInvitation(invited, { token, claimantRole: 'CEO', authorised: 'yes' })).rejects.toThrow(/already has an account holder/);
  });
});
