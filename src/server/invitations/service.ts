import 'server-only';
import { z } from 'zod';
import { composeInvitation, type InvitationFacts } from '@/domain/invitations/compose';
import { assessEligibility, CATEGORY_LABEL, domainMatches, type CompanyLike, type Eligibility, isFreeMail, normaliseEmail, websiteDomain } from '@/domain/invitations/eligibility';
import type { InvitationStatus } from '@/generated/prisma/enums';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { mailerConfig, mailerStatus, sendEmail, SendError } from '@/server/email/mailer';
import { AppError, notFound } from '@/server/errors';
import { notify, staffWith } from '@/server/notifications';
import { hashToken, looksLikeToken, newToken, unsubscribeParams } from './tokens';

// ---- Configuration (environment; safe defaults) ----------------------------------------------

export function inviteConfig() {
  const n = (k: string, d: number) => (Number.isFinite(Number(process.env[k])) && process.env[k] ? Number(process.env[k]) : d);
  return {
    appUrl: (process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, ''),
    // 0 (the default) = links never expire. Revocation still withdraws a link at any time.
    expiryDays: n('INVITE_EXPIRY_DAYS', 0),
    /** Real recipients can be e-mailed only when this is exactly "true". Default: off. */
    liveSendEnabled: process.env.LIVE_SEND_ENABLED === 'true',
    intervalSeconds: n('INVITE_SEND_INTERVAL_SECONDS', 45),
    dailyCap: n('INVITE_DAILY_CAP', 80),
    postalAddress: process.env.SENDER_POSTAL_ADDRESS?.trim() || null,
    testAllowlist: (process.env.INVITE_TEST_ALLOWLIST ?? '').split(',').map(normaliseEmail).filter(Boolean),
  };
}

/** Everything that must be true before a single real company is e-mailed. */
export function liveSendBlockers() {
  const c = inviteConfig();
  const m = mailerStatus();
  return [
    !c.liveSendEnabled && 'LIVE_SEND_ENABLED is not "true"',
    !m.configured && `SMTP is not configured (${m.missing.join(', ')})`,
    // Capture mode delivers nothing; it is only acceptable inside the automated test suite.
    mailerConfig().capture && process.env.NODE_ENV !== 'test' && 'SMTP_TRANSPORT=capture (no real delivery)',
    !c.postalAddress && 'SENDER_POSTAL_ADDRESS is not set (sender identification)',
    !process.env.PUBLIC_APP_URL && 'PUBLIC_APP_URL is not set',
  ].filter(Boolean) as string[];
}

const LIVE: InvitationStatus[] = ['APPROVED', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED'];

// ---- Candidates ------------------------------------------------------------------------------

export interface Candidate {
  operatorId: string;
  name: string;
  countryCode: string;
  website: string | null;
  eligibility: Eligibility;
  categoryLabel: string;
  facts: InvitationFacts | null;
  latestInvitation: { id: string; status: InvitationStatus; email: string; sentAt: Date | null; expiresAt: Date | null; isTest: boolean } | null;
}

export async function listCandidates(tx: Tx | typeof prisma = prisma): Promise<Candidate[]> {
  const [ops, suppressed, addressRows] = await Promise.all([
    tx.operator.findMany({
      where: { deletedAt: null },
      orderBy: { displayName: 'asc' },
      select: {
        id: true, displayName: true, countryCode: true, lifecycle: true, website: true, deletedAt: true, baseDescription: true,
        researchOperatorKind: true, researchRelevance: true, researchCharterActivity: true,
        contacts: { where: { deletedAt: null }, select: { id: true, kind: true, name: true, emails: true, confidence: true, doNotContact: true, deletedAt: true } },
        invitations: { orderBy: { createdAt: 'desc' }, select: { id: true, status: true, email: true, sentAt: true, expiresAt: true, isTest: true } },
        _count: { select: { authorizations: true, aircraft: { where: { deletedAt: null } }, memberships: { where: { status: 'ACTIVE' } }, claims: { where: { status: { in: ['SUBMITTED', 'NEEDS_INFO'] } } } } },
      },
    }),
    tx.emailSuppression.findMany({ select: { email: true } }),
    tx.$queryRaw<{ email: string; n: number }[]>`SELECT lower(e) AS email, count(DISTINCT ct."operatorId")::int AS n FROM "OperatorContact" ct, unnest(ct.emails) e WHERE ct."deletedAt" IS NULL GROUP BY 1`,
  ]);
  const now = new Date();
  const ctx = {
    suppressed: new Set(suppressed.map((s) => s.email)),
    addressCompanyCount: new Map(addressRows.map((r) => [r.email, r.n])),
    liveInvitation: new Set(ops.filter((o) => o.invitations.some((i) => !i.isTest && LIVE.includes(i.status) && (!i.expiresAt || i.expiresAt > now))).map((o) => o.id)),
  };
  return ops.map((o) => {
    const company: CompanyLike = { ...o, authorizationCount: o._count.authorizations, activeMemberCount: o._count.memberships, openClaimCount: o._count.claims, contacts: o.contacts };
    const eligibility = assessEligibility(company, ctx);
    const r = eligibility.recipient;
    const facts: InvitationFacts | null = r
      ? { companyName: o.displayName, countryCode: o.countryCode, place: o.baseDescription && o.baseDescription.length <= 40 ? o.baseDescription : null, websiteDomain: websiteDomain(o.website), source: r.source, publicAircraftCount: o._count.aircraft, recipientName: r.name, recipientEmail: r.email }
      : null;
    const real = o.invitations.find((i) => !i.isTest) ?? null;
    return { operatorId: o.id, name: o.displayName, countryCode: o.countryCode, website: o.website, eligibility, categoryLabel: CATEGORY_LABEL[eligibility.category], facts, latestInvitation: real };
  });
}

/** When a link issued now stops working, or null when links never expire (the default). */
function linkExpiry(): Date | null {
  const days = inviteConfig().expiryDays;
  return days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
}

function links(rawToken: string | null, email: string) {
  const c = inviteConfig();
  const u = unsubscribeParams(email);
  return {
    claimUrl: rawToken ? `${c.appUrl}/claim/${rawToken}` : `${c.appUrl}/claim/<unique-link-generated-at-send>`,
    unsubscribeUrl: `${c.appUrl}/unsubscribe?e=${u.e}&s=${u.s}`,
    appUrl: c.appUrl,
  };
}

function sender() {
  return { name: mailerConfig().fromName, postalAddress: inviteConfig().postalAddress, replyTo: mailerConfig().replyTo };
}

/** Standard bulk-mail headers: one-click unsubscribe (RFC 8058) and a mailto fallback. */
function listHeaders(email: string, inviteId: string) {
  const c = inviteConfig();
  const u = unsubscribeParams(email);
  const from = mailerConfig().fromEmail;
  return {
    'List-Unsubscribe': `<${c.appUrl}/api/unsubscribe?e=${u.e}&s=${u.s}>${from ? `, <mailto:${from}?subject=unsubscribe>` : ''}`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Entity-Ref-ID': inviteId,
  };
}

export async function previewFor(operatorId: string) {
  const all = await listCandidates();
  const c = all.find((x) => x.operatorId === operatorId);
  if (!c) throw notFound('Company');
  if (!c.facts) return { candidate: c, email: null };
  return { candidate: c, email: composeInvitation(c.facts, links(null, c.facts.recipientEmail), sender()) };
}

async function event(tx: Tx | typeof prisma, invitationId: string, type: string, actorUserId: string | null, detail?: Record<string, unknown>) {
  await tx.invitationEvent.create({ data: { invitationId, type, actorUserId, detail: (detail ?? undefined) as never } });
}

function need(viewer: Viewer, p: 'invite.manage' | 'invite.send') {
  if (!viewer.permissions.has(p)) throw new AppError('FORBIDDEN', 'Not allowed.');
}

// ---- Test e-mail: real SMTP, staff address only, link can never claim -------------------------

export async function sendTestInvitation(viewer: Viewer, operatorId: string, to: string) {
  need(viewer, 'invite.manage');
  const target = normaliseEmail(to);
  const allowed = new Set([normaliseEmail(viewer.user.email), ...inviteConfig().testAllowlist]);
  if (!allowed.has(target)) throw new AppError('VALIDATION', 'Test e-mails go only to your own address (or INVITE_TEST_ALLOWLIST).', { to: 'Not an allowed test address' });
  const m = mailerStatus();
  if (!m.configured) throw new AppError('NOT_CONFIGURED', `E-mail is not configured: missing ${m.missing.join(', ')}.`);
  const all = await listCandidates();
  const c = all.find((x) => x.operatorId === operatorId);
  if (!c?.facts) throw new AppError('VALIDATION', 'This company has no usable business address, so there is nothing to preview.');
  const { raw, hash } = newToken();
  const expiresAt = linkExpiry();
  const inv = await prisma.operatorInvitation.create({ data: { operatorId, email: target, recipientName: c.facts.recipientName, tokenHash: hash, status: 'READY', isTest: true, expiresAt, createdById: viewer.user.id } });
  // The test shows exactly what the company would receive, addressed to the staff inbox.
  const composed = composeInvitation({ ...c.facts }, links(raw, c.facts.recipientEmail), sender());
  try {
    const res = await sendEmail({ to: target, subject: `[TEST] ${composed.subject}`, text: composed.text, html: composed.html, headers: listHeaders(target, inv.id) });
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'TEST_SENT', sentAt: new Date(), providerMessageId: res.messageId, sendAttempts: 1 } });
    await event(prisma, inv.id, 'test_sent', viewer.user.id, { to: target, messageId: res.messageId });
    await audit({ actorUserId: viewer.user.id, action: 'invitation.test_send', entityType: 'OperatorInvitation', entityId: inv.id, after: { operatorId, to: target } });
    return { ok: true as const, messageId: res.messageId, claimUrl: links(raw, target).claimUrl };
  } catch (err) {
    const e = err instanceof SendError ? err : new SendError('UNKNOWN', 'Sending failed.');
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'FAILED', lastError: e.message, sendAttempts: 1 } });
    await event(prisma, inv.id, 'send_failed', viewer.user.id, { kind: e.kind, message: e.message });
    throw new AppError(e.kind === 'CONFIG' ? 'NOT_CONFIGURED' : 'INVALID_STATE', e.message);
  }
}

// ---- Campaigns -------------------------------------------------------------------------------

export const campaignSchema = z.object({ name: z.string().trim().min(3).max(120), operatorIds: z.array(z.string()).min(1).max(2000) });

/** Creates READY invitations for the selected companies that are eligible right now. Sends nothing. */
export async function createCampaign(viewer: Viewer, raw: unknown) {
  need(viewer, 'invite.manage');
  const input = campaignSchema.parse(raw);
  const all = new Map((await listCandidates()).map((c) => [c.operatorId, c]));
  const seen = new Set<string>();
  const ready: { operatorId: string; email: string; name: string | null; contactId: string }[] = [];
  const skipped: { operatorId: string; name: string; reasons: string[] }[] = [];
  for (const id of new Set(input.operatorIds)) {
    const c = all.get(id);
    if (!c) continue;
    const r = c.eligibility.recipient;
    if (!c.eligibility.eligible || !r) { skipped.push({ operatorId: id, name: c.name, reasons: c.eligibility.reasons }); continue; }
    if (seen.has(r.email)) { skipped.push({ operatorId: id, name: c.name, reasons: ['duplicate recipient address in this campaign'] }); continue; }
    seen.add(r.email);
    ready.push({ operatorId: id, email: r.email, name: r.name, contactId: r.contactId });
  }
  if (!ready.length) throw new AppError('VALIDATION', 'None of the selected companies is eligible right now.');
  const campaign = await prisma.$transaction(async (tx) => {
    const camp = await tx.invitationCampaign.create({ data: { name: input.name, createdById: viewer.user.id } });
    for (const r of ready) {
      const inv = await tx.operatorInvitation.create({ data: { campaignId: camp.id, operatorId: r.operatorId, contactId: r.contactId, email: r.email, recipientName: r.name, status: 'READY', createdById: viewer.user.id } });
      await event(tx, inv.id, 'created', viewer.user.id, { campaignId: camp.id });
    }
    await audit({ actorUserId: viewer.user.id, action: 'invitation.campaign.create', entityType: 'InvitationCampaign', entityId: camp.id, after: { ready: ready.length, skipped: skipped.length } }, tx);
    return camp;
  });
  return { campaign, ready: ready.length, skipped };
}

export async function campaignSummary(campaignId: string) {
  const camp = await prisma.invitationCampaign.findUnique({ where: { id: campaignId }, include: { invitations: { include: { operator: { select: { displayName: true, countryCode: true } } }, orderBy: { createdAt: 'asc' } } } });
  if (!camp) throw notFound('Campaign');
  const byStatus: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  for (const i of camp.invitations) {
    byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
    if (i.status === 'READY' || i.status === 'PREVIEWED') byCountry[i.operator.countryCode] = (byCountry[i.operator.countryCode] ?? 0) + 1;
  }
  return { camp, byStatus, byCountry, readyCount: (byStatus.READY ?? 0) + (byStatus.PREVIEWED ?? 0) };
}

/**
 * The approval gate. Requires the dedicated permission, every live-send precondition, and the
 * exact recipient count the approver saw. Queues one job per invitation, spaced out in time.
 */
export async function approveAndQueueCampaign(viewer: Viewer, campaignId: string, confirmCount: number) {
  need(viewer, 'invite.send');
  const blockers = liveSendBlockers();
  if (blockers.length) throw new AppError('INVALID_STATE', `Live sending is blocked: ${blockers.join('; ')}.`);
  const { camp, readyCount } = await campaignSummary(campaignId);
  if (camp.status !== 'DRAFT') throw new AppError('INVALID_STATE', 'This campaign has already been approved or closed.');
  if (confirmCount !== readyCount) throw new AppError('VALIDATION', `The campaign now has ${readyCount} recipients, not ${confirmCount}. Review it again before approving.`, { confirmCount: 'Count changed' });
  // Re-check every recipient at the moment of approval (suppressions, claims, other campaigns).
  const current = new Map((await listCandidates()).map((c) => [c.operatorId, c]));
  const cfg = inviteConfig();
  const start = Date.now();
  let slot = 0;
  return prisma.$transaction(async (tx) => {
    let queued = 0;
    for (const inv of camp.invitations.filter((i) => i.status === 'READY' || i.status === 'PREVIEWED')) {
      const c = current.get(inv.operatorId);
      // Strict: any live invitation elsewhere (another campaign) makes this one ineligible: no double sends.
      const stillOk = c && c.eligibility.eligible && c.eligibility.recipient?.email === inv.email;
      if (!stillOk) {
        await tx.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'REVOKED', revokedAt: new Date(), lastError: 'No longer eligible at approval time' } });
        await event(tx, inv.id, 'revoked', viewer.user.id, { reason: c?.eligibility.reasons ?? ['company not found'] });
        continue;
      }
      const runAt = new Date(start + slot++ * cfg.intervalSeconds * 1000);
      await tx.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'QUEUED' } });
      await tx.job.create({ data: { type: 'invitation.send', payload: { invitationId: inv.id }, runAt, maxAttempts: 4, dedupeKey: `invitation.send:${inv.id}:1` } });
      await event(tx, inv.id, 'queued', viewer.user.id, { runAt: runAt.toISOString() });
      queued++;
    }
    await tx.invitationCampaign.update({ where: { id: camp.id }, data: { status: 'SENDING', approvedById: viewer.user.id, approvedAt: new Date(), approvedCount: confirmCount } });
    await audit({ actorUserId: viewer.user.id, action: 'invitation.campaign.approve', entityType: 'InvitationCampaign', entityId: camp.id, after: { confirmCount, queued } }, tx);
    return { queued };
  });
}

export async function revokeInvitation(viewer: Viewer, invitationId: string, reason: string) {
  need(viewer, 'invite.manage');
  const res = await prisma.operatorInvitation.updateMany({ where: { id: invitationId, status: { notIn: ['CLAIMED', 'REVOKED'] } }, data: { status: 'REVOKED', revokedAt: new Date() } });
  if (!res.count) throw new AppError('INVALID_STATE', 'This invitation is already claimed or revoked.');
  await event(prisma, invitationId, 'revoked', viewer.user.id, { reason });
  await audit({ actorUserId: viewer.user.id, action: 'invitation.revoke', entityType: 'OperatorInvitation', entityId: invitationId, after: { reason } });
}

/** Re-sends with a NEW link (the old one stops working the moment the new one is issued). */
export async function resendInvitation(viewer: Viewer, invitationId: string) {
  need(viewer, 'invite.send');
  const blockers = liveSendBlockers();
  if (blockers.length) throw new AppError('INVALID_STATE', `Live sending is blocked: ${blockers.join('; ')}.`);
  const inv = await prisma.operatorInvitation.findUnique({ where: { id: invitationId } });
  if (!inv || inv.isTest) throw notFound('Invitation');
  if (!['SENT', 'EXPIRED', 'FAILED', 'DELIVERED', 'OPENED'].includes(inv.status)) throw new AppError('INVALID_STATE', `An invitation that is ${inv.status.toLowerCase()} cannot be re-sent.`);
  if (await prisma.emailSuppression.findUnique({ where: { email: inv.email } })) throw new AppError('INVALID_STATE', 'This address is suppressed (unsubscribed or bounced).');
  const n = (await prisma.invitationEvent.count({ where: { invitationId, type: 'resent' } })) + 2;
  await prisma.$transaction(async (tx) => {
    await tx.operatorInvitation.update({ where: { id: invitationId }, data: { status: 'QUEUED', tokenHash: null, lastError: null } });
    await tx.job.create({ data: { type: 'invitation.send', payload: { invitationId }, maxAttempts: 4, dedupeKey: `invitation.send:${invitationId}:${n}` } });
    await event(tx, invitationId, 'resent', viewer.user.id);
  });
}

// ---- Background send (one invitation per job; never twice) ----------------------------------

/**
 * Exactly-once intent: QUEUED → SENDING is a conditional update, so a retried or duplicated job
 * finds nothing to do. If the process dies after the SMTP hand-off but before recording it, the
 * row stays SENDING and is never re-sent automatically (a sweep marks it FAILED for review).
 */
export async function processInvitationJob(invitationId: string) {
  const cfg = inviteConfig();
  if (!cfg.liveSendEnabled) {
    await prisma.operatorInvitation.updateMany({ where: { id: invitationId, status: 'QUEUED' }, data: { lastError: 'Waiting: live sending is disabled' } });
    throw new Error('Live sending is disabled; job will retry later.');
  }
  const sentToday = await prisma.operatorInvitation.count({ where: { isTest: false, sentAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (sentToday >= cfg.dailyCap) {
    const later = new Date(Date.now() + 60 * 60_000);
    await prisma.job.create({ data: { type: 'invitation.send', payload: { invitationId }, runAt: later, maxAttempts: 4, dedupeKey: `invitation.send:${invitationId}:cap:${later.getTime()}` } });
    return { deferred: true };
  }
  const inv = await prisma.operatorInvitation.findUnique({ where: { id: invitationId }, include: { operator: { select: { id: true } } } });
  if (!inv || inv.status !== 'QUEUED' || inv.isTest) return { skipped: true };
  if (await prisma.emailSuppression.findUnique({ where: { email: inv.email } })) {
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'UNSUBSCRIBED' } });
    await event(prisma, inv.id, 'suppressed', null);
    return { skipped: true };
  }
  const cand = (await listCandidates()).find((c) => c.operatorId === inv.operatorId);
  if (!cand?.facts) {
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'FAILED', lastError: 'Company no longer has a usable address' } });
    return { skipped: true };
  }
  const { raw, hash } = newToken();
  const expiresAt = linkExpiry();
  const claimed = await prisma.operatorInvitation.updateMany({ where: { id: inv.id, status: 'QUEUED' }, data: { status: 'SENDING', tokenHash: hash, expiresAt, sendAttempts: { increment: 1 } } });
  if (!claimed.count) return { skipped: true };
  const composed = composeInvitation({ ...cand.facts, recipientEmail: inv.email, recipientName: inv.recipientName }, links(raw, inv.email), sender());
  try {
    const res = await sendEmail({ to: inv.email, subject: composed.subject, text: composed.text, html: composed.html, headers: listHeaders(inv.email, inv.id) });
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'SENT', sentAt: new Date(), providerMessageId: res.messageId, lastError: null } });
    await event(prisma, inv.id, 'sent', null, { messageId: res.messageId });
    return { sent: true };
  } catch (err) {
    const e = err instanceof SendError ? err : new SendError('UNKNOWN', 'Sending failed.');
    if (e.kind === 'HARD_BOUNCE') {
      await prisma.$transaction([
        prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'BOUNCED', lastError: e.message } }),
        prisma.emailSuppression.upsert({ where: { email: inv.email }, create: { email: inv.email, reason: 'HARD_BOUNCE', source: `invitation ${inv.id}` }, update: {} }),
      ]);
      await event(prisma, inv.id, 'bounced', null, { message: e.message });
      return { bounced: true }; // never retried
    }
    // Nothing was accepted by the server: safe to put back and let the job retry with backoff.
    await prisma.operatorInvitation.update({ where: { id: inv.id }, data: { status: 'QUEUED', tokenHash: null, lastError: e.message } });
    await event(prisma, inv.id, 'send_failed', null, { kind: e.kind, message: e.message });
    throw e;
  }
}

/** Called when a send job is out of retries. */
export async function markInvitationFailed(invitationId: string, message: string) {
  await prisma.operatorInvitation.updateMany({ where: { id: invitationId, status: { in: ['QUEUED', 'SENDING'] } }, data: { status: 'FAILED', lastError: message.slice(0, 500) } });
}

/** Sweeps: expire old links; flag sends whose outcome is unknown. Idempotent. */
export async function invitationSweeps(now = new Date()) {
  const expired = await prisma.operatorInvitation.updateMany({ where: { status: { in: ['SENT', 'DELIVERED', 'OPENED', 'TEST_SENT'] }, expiresAt: { lt: now } }, data: { status: 'EXPIRED' } });
  const stuck = await prisma.operatorInvitation.updateMany({ where: { status: 'SENDING', updatedAt: { lt: new Date(now.getTime() - 30 * 60_000) } }, data: { status: 'FAILED', lastError: 'Outcome unknown: the sender stopped mid-send. Check the mailbox before re-sending.' } });
  return { invitationsExpired: expired.count, sendsUnknown: stuck.count };
}

// ---- Suppression / unsubscribe ---------------------------------------------------------------

export async function suppress(email: string, reason: 'UNSUBSCRIBED' | 'HARD_BOUNCE' | 'COMPLAINT' | 'MANUAL', source: string) {
  const e = normaliseEmail(email);
  await prisma.emailSuppression.upsert({ where: { email: e }, create: { email: e, reason, source }, update: {} });
  const open = await prisma.operatorInvitation.findMany({ where: { email: e, status: { in: ['READY', 'PREVIEWED', 'APPROVED', 'QUEUED'] } }, select: { id: true } });
  await prisma.operatorInvitation.updateMany({ where: { id: { in: open.map((o) => o.id) } }, data: { status: 'UNSUBSCRIBED' } });
  for (const o of open) await event(prisma, o.id, 'unsubscribed', null, { source });
}

// ---- The claim journey -----------------------------------------------------------------------

export type InvitationView =
  | { state: 'invalid' }
  | { state: 'test' | 'revoked' | 'expired' | 'claimed' | 'unsubscribed' | 'has_owner' | 'valid'; invitationId: string; email: string; expiresAt: Date | null; company: { id: string; name: string; legalName: string; countryCode: string; website: string | null; lifecycle: string; authorizations: { authority: string; numberRaw: string | null }[]; aircraftCount: number } };

/** Read-only: never consumes the link (mail scanners may fetch it). Records the first visit only. */
export async function viewInvitation(raw: string): Promise<InvitationView> {
  if (!looksLikeToken(raw)) return { state: 'invalid' };
  const inv = await prisma.operatorInvitation.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { operator: { select: { id: true, displayName: true, legalName: true, countryCode: true, website: true, lifecycle: true, authorizations: { select: { authority: true, numberRaw: true } }, _count: { select: { aircraft: { where: { deletedAt: null } }, memberships: { where: { status: 'ACTIVE' } } } } } } },
  });
  if (!inv) return { state: 'invalid' };
  if (!inv.firstVisitedAt) {
    const first = await prisma.operatorInvitation.updateMany({ where: { id: inv.id, firstVisitedAt: null }, data: { firstVisitedAt: new Date() } });
    if (first.count) await event(prisma, inv.id, 'visited', null);
  }
  const o = inv.operator;
  const company = { id: o.id, name: o.displayName, legalName: o.legalName, countryCode: o.countryCode, website: o.website, lifecycle: o.lifecycle, authorizations: o.authorizations, aircraftCount: o._count.aircraft };
  const base = { invitationId: inv.id, email: inv.email, expiresAt: inv.expiresAt, company };
  if (inv.isTest) return { state: 'test', ...base };
  if (inv.status === 'REVOKED') return { state: 'revoked', ...base };
  if (inv.status === 'UNSUBSCRIBED') return { state: 'unsubscribed', ...base };
  if (inv.status === 'CLAIMED') return { state: 'claimed', ...base };
  if (inv.status === 'EXPIRED' || (inv.expiresAt && inv.expiresAt <= new Date())) return { state: 'expired', ...base };
  if (!['SENT', 'DELIVERED', 'OPENED'].includes(inv.status)) return { state: 'invalid' };
  if (o._count.memberships > 0) return { state: 'has_owner', ...base };
  return { state: 'valid', ...base };
}

export const invitationClaimSchema = z.object({
  token: z.string(),
  claimantRole: z.string().trim().min(2, 'Your role at the company').max(100),
  workPhone: z.string().trim().max(30).optional(),
  authorised: z.literal('yes', { error: 'Confirm that you may represent the company' }),
});

/**
 * Explicit, signed-in action. Re-validates everything server-side, consumes the link exactly once
 * (conditional update), and creates a normal claim for staff review. It never grants membership
 * or changes the company's status by itself.
 */
export async function claimViaInvitation(viewer: Viewer, raw: unknown) {
  const input = invitationClaimSchema.parse(raw);
  if (!looksLikeToken(input.token)) throw new AppError('NOT_FOUND', 'This invitation link is not valid.');
  const inv = await prisma.operatorInvitation.findUnique({ where: { tokenHash: hashToken(input.token) }, include: { operator: { select: { id: true, displayName: true, website: true, lifecycle: true, _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } } } } });
  if (!inv) throw new AppError('NOT_FOUND', 'This invitation link is not valid.');
  if (inv.isTest) throw new AppError('INVALID_STATE', 'This is a test invitation. It cannot be used to claim a company.');
  if (normaliseEmail(viewer.user.email) !== inv.email) throw new AppError('FORBIDDEN', 'Sign in with the e-mail address this invitation was sent to.');
  if (inv.operator._count.memberships > 0) throw new AppError('INVALID_STATE', 'This company already has an account holder. Contact us if you need access.');
  if (['EXCLUDED', 'REJECTED', 'SUSPENDED'].includes(inv.operator.lifecycle)) throw new AppError('INVALID_STATE', 'This company profile is not open for claims.');
  const reviewNotes: string[] = [`Claimed through invitation ${inv.id}, sent to ${inv.email}; the claimant signed in with that address.`];
  if (isFreeMail(inv.email)) reviewNotes.push('Free-mail address: confirm ownership before approving.');
  else if (!domainMatches(inv.email, inv.operator.website)) reviewNotes.push("Address is not on the company's website domain: confirm ownership before approving.");
  else reviewNotes.push("Address is on the company's own website domain.");

  return prisma.$transaction(async (tx) => {
    const used = await tx.operatorInvitation.updateMany({
      where: { id: inv.id, status: { in: ['SENT', 'DELIVERED', 'OPENED'] }, isTest: false, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      data: { status: 'CLAIMED', claimedAt: new Date(), claimedByUserId: viewer.user.id },
    });
    if (!used.count) throw new AppError('INVALID_STATE', 'This invitation has already been used or has been withdrawn.');
    const claim = await tx.operatorClaim.create({
      data: { operatorId: inv.operatorId, userId: viewer.user.id, claimantRole: input.claimantRole, workEmail: inv.email, workPhone: input.workPhone || null, message: reviewNotes.join(' ') },
    });
    await tx.operatorInvitation.update({ where: { id: inv.id }, data: { claimId: claim.id } });
    await event(tx, inv.id, 'claimed', viewer.user.id, { claimId: claim.id });
    await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN'], tx), type: 'claim.submitted', title: 'Invitation claim to review', body: `${viewer.user.name} claimed ${inv.operator.displayName} from an invitation.`, link: `/admin/claims/${claim.id}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'invitation.claim', entityType: 'OperatorInvitation', entityId: inv.id, after: { claimId: claim.id } }, tx);
    return claim;
  });
}
