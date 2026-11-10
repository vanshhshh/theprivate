import 'server-only';
import { z } from 'zod';
import { operatorLifecycle } from '@/domain/lifecycle';
import { orgMatchKey, slugify } from '@/domain/imports/normalize';
import { Prisma } from '@/generated/prisma/client';
import type { OperatorLifecycle, VerificationCheckType } from '@/generated/prisma/enums';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds, staffWith } from '@/server/notifications';
import { storeUpload } from '@/server/storage';

/** Checks that must be ACCEPTED before an operator can be VERIFIED. */
export const REQUIRED_CHECKS: VerificationCheckType[] = ['AUTHORITY_CERTIFICATE', 'COMPANY_REGISTRATION', 'INSURANCE'];

async function setLifecycle(tx: Tx, operatorId: string, to: OperatorLifecycle, actor: 'OPERATOR' | 'STAFF', actorUserId: string, note?: string) {
  const op = await tx.operator.findUniqueOrThrow({ where: { id: operatorId } });
  operatorLifecycle.assert(op.lifecycle, to, actor);
  await tx.operator.update({ where: { id: operatorId }, data: { lifecycle: to, lifecycleChangedAt: new Date(), ...(to === 'SUSPENDED' || to === 'EXCLUDED' || to === 'REJECTED' ? { isPubliclyListed: false } : {}) } });
  await audit({ actorUserId, action: 'operator.lifecycle.change', entityType: 'Operator', entityId: operatorId, before: { lifecycle: op.lifecycle }, after: { lifecycle: to, note } }, tx);
  return op;
}

// ---- Directory used for claiming (names only; no private data) -----------------------------

export async function claimDirectory(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  return prisma.operator.findMany({
    where: { deletedAt: null, lifecycle: { notIn: ['EXCLUDED', 'REJECTED'] }, OR: [{ legalName: { contains: term, mode: 'insensitive' } }, { aliases: { some: { matchKey: { contains: orgMatchKey(term) } } } }] },
    select: { id: true, legalName: true, countryCode: true, lifecycle: true, _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } },
    orderBy: { legalName: 'asc' },
    take: 20,
  });
}

export const claimSchema = z.object({
  operatorId: z.string().optional(),
  proposedName: z.string().trim().max(200).optional(),
  proposedCountry: z.string().trim().length(2).optional().or(z.literal('')),
  claimantRole: z.string().trim().min(2, 'Your role at the company').max(100),
  workEmail: z.email('Enter a work e-mail'),
  workPhone: z.string().trim().max(30).optional(),
  authorityNumber: z.string().trim().max(60).optional(),
  message: z.string().trim().max(2000).optional(),
});

/** A claim is a REQUEST. It grants nothing until staff approve it. */
export async function submitClaim(viewer: Viewer, raw: unknown) {
  const input = claimSchema.parse(raw);
  if (!input.operatorId && !input.proposedName) throw new AppError('VALIDATION', 'Choose your company or enter its name.', { proposedName: 'Required' });
  const open = await prisma.operatorClaim.count({ where: { userId: viewer.user.id, status: { in: ['SUBMITTED', 'NEEDS_INFO'] } } });
  if (open >= 3) throw new AppError('RATE_LIMITED', 'You already have open claims under review.');
  if (input.operatorId) {
    const op = await prisma.operator.findUnique({ where: { id: input.operatorId } });
    if (!op || op.deletedAt || ['EXCLUDED', 'REJECTED'].includes(op.lifecycle)) throw notFound('Operator');
  }
  return prisma.$transaction(async (tx) => {
    const claim = await tx.operatorClaim.create({
      data: {
        operatorId: input.operatorId || null,
        userId: viewer.user.id,
        proposedName: input.operatorId ? null : input.proposedName,
        proposedCountry: input.operatorId ? null : input.proposedCountry || null,
        claimantRole: input.claimantRole,
        workEmail: input.workEmail.toLowerCase(),
        workPhone: input.workPhone || null,
        authorityNumber: input.authorityNumber || null,
        message: input.message || null,
      },
    });
    await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN'], tx), type: 'claim.submitted', title: 'New operator claim', body: `${viewer.user.name} submitted a claim.`, link: `/admin/claims/${claim.id}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'claim.submit', entityType: 'OperatorClaim', entityId: claim.id }, tx);
    return claim;
  });
}

export async function reviewClaim(viewer: Viewer, claimId: string, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO', note: string) {
  if (!viewer.permissions.has('claim.review')) throw new AppError('FORBIDDEN', 'Not allowed.');
  if (decision !== 'APPROVED' && note.trim().length < 5) throw new AppError('VALIDATION', 'Explain the decision to the claimant.', { note: 'Required' });
  return prisma.$transaction(async (tx) => {
    const c = await tx.operatorClaim.findUnique({ where: { id: claimId } });
    if (!c) throw notFound('Claim');
    if (!['SUBMITTED', 'NEEDS_INFO'].includes(c.status)) throw new AppError('INVALID_STATE', 'This claim has already been decided.');
    let operatorId = c.operatorId;
    if (decision === 'APPROVED') {
      if (!operatorId) {
        const country = c.proposedCountry ?? 'IN';
        await tx.country.upsert({ where: { code: country }, create: { code: country, name: country }, update: {} });
        let slug = slugify(c.proposedName!) || 'operator';
        if (await tx.operator.findUnique({ where: { slug } })) slug = `${slug}-${claimId.slice(-5)}`;
        const op = await tx.operator.create({ data: { slug, legalName: c.proposedName!, displayName: c.proposedName!, countryCode: country } });
        operatorId = op.id;
        await tx.operatorClaim.update({ where: { id: c.id }, data: { operatorId } });
      }
      await tx.operatorMembership.upsert({
        where: { operatorId_userId: { operatorId, userId: c.userId } },
        create: { operatorId, userId: c.userId, role: 'OWNER', status: 'ACTIVE', approvedById: viewer.user.id, approvedAt: new Date() },
        update: { role: 'OWNER', status: 'ACTIVE', approvedById: viewer.user.id, approvedAt: new Date() },
      });
      const op = await tx.operator.findUniqueOrThrow({ where: { id: operatorId } });
      if (op.lifecycle === 'DISCOVERED') await setLifecycle(tx, operatorId, 'CLAIMED', 'STAFF', viewer.user.id, `Claim ${c.id} approved`);
    }
    await tx.operatorClaim.update({ where: { id: c.id }, data: { status: decision, reviewerId: viewer.user.id, decisionNote: note.trim() || null, decidedAt: decision === 'NEEDS_INFO' ? null : new Date() } });
    await notify({ userIds: [c.userId], type: `claim.${decision.toLowerCase()}`, title: decision === 'APPROVED' ? 'Your operator claim was approved' : decision === 'REJECTED' ? 'Your operator claim was not approved' : 'More information needed for your claim', body: note.trim() || 'You can now open the operator workspace.', link: decision === 'APPROVED' ? '/operator' : '/operator/onboarding' }, tx);
    await audit({ actorUserId: viewer.user.id, action: `claim.${decision.toLowerCase()}`, entityType: 'OperatorClaim', entityId: c.id, after: { operatorId, note } }, tx);
  });
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  website: z.url('Enter a full URL (https://…)').optional().or(z.literal('')),
  headquartersAddress: z.string().trim().max(500).optional(),
  baseDescription: z.string().trim().max(200).optional(),
  publicDescription: z.string().trim().max(2000).optional(),
});

export async function updateOperatorProfile(ctx: { viewer: Viewer; operatorId: string }, raw: unknown) {
  const input = profileSchema.parse(raw);
  const before = await prisma.operator.findUniqueOrThrow({ where: { id: ctx.operatorId } });
  const data = { displayName: input.displayName, website: input.website || null, headquartersAddress: input.headquartersAddress || null, baseDescription: input.baseDescription || null, publicDescription: input.publicDescription || null };
  await prisma.operator.update({ where: { id: ctx.operatorId }, data });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'operator.profile.update', entityType: 'Operator', entityId: ctx.operatorId, before: { displayName: before.displayName, website: before.website }, after: data });
}

// ---- Verification -------------------------------------------------------------------------

export async function uploadVerificationDocument(ctx: { viewer: Viewer; operatorId: string }, type: VerificationCheckType, file: File, expiresAt: string | null) {
  return prisma.$transaction(async (tx) => {
    const check = await tx.verificationCheck.findUnique({ where: { operatorId_type: { operatorId: ctx.operatorId, type } } });
    if (check?.status === 'ACCEPTED') throw new AppError('INVALID_STATE', 'This check was already accepted.');
    const doc = await storeUpload(file, { kind: type === 'INSURANCE' ? 'INSURANCE' : type === 'AUTHORITY_CERTIFICATE' ? 'AUTHORITY_CERTIFICATE' : type === 'COMPANY_REGISTRATION' ? 'COMPANY_REGISTRATION' : 'OTHER', uploadedById: ctx.viewer.user.id, allowed: ['pdf', 'image'] }, tx);
    await tx.operatorDocument.create({ data: { operatorId: ctx.operatorId, documentId: doc.id, label: type } });
    const data = { status: 'SUBMITTED' as const, documentId: doc.id, expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00Z`) : null, reviewNote: null, reviewedAt: null, reviewerId: null };
    await tx.verificationCheck.upsert({ where: { operatorId_type: { operatorId: ctx.operatorId, type } }, create: { operatorId: ctx.operatorId, type, ...data }, update: data });
    await audit({ actorUserId: ctx.viewer.user.id, action: 'verification.upload', entityType: 'Operator', entityId: ctx.operatorId, after: { type, documentId: doc.id } }, tx);
  });
}

export async function submitForVerification(ctx: { viewer: Viewer; operatorId: string }) {
  return prisma.$transaction(async (tx) => {
    const checks = await tx.verificationCheck.findMany({ where: { operatorId: ctx.operatorId } });
    const missing = REQUIRED_CHECKS.filter((t) => !checks.some((c) => c.type === t && ['SUBMITTED', 'ACCEPTED'].includes(c.status)));
    if (missing.length) throw new AppError('VALIDATION', `Upload these documents first: ${missing.map((m) => m.toLowerCase().replace(/_/g, ' ')).join(', ')}.`);
    await setLifecycle(tx, ctx.operatorId, 'IN_REVIEW', 'OPERATOR', ctx.viewer.user.id);
    await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN'], tx), type: 'verification.submitted', title: 'Operator submitted verification', body: 'Documents are ready for review.', link: `/admin/operators/${ctx.operatorId}` }, tx);
  });
}

export async function reviewCheck(viewer: Viewer, checkId: string, decision: 'ACCEPTED' | 'REJECTED', note: string) {
  if (!viewer.permissions.has('verification.review')) throw new AppError('FORBIDDEN', 'Not allowed.');
  if (decision === 'REJECTED' && note.trim().length < 5) throw new AppError('VALIDATION', 'Explain what is wrong with the document.', { note: 'Required' });
  return prisma.$transaction(async (tx) => {
    const c = await tx.verificationCheck.findUnique({ where: { id: checkId } });
    if (!c || c.status !== 'SUBMITTED') throw new AppError('INVALID_STATE', 'Only submitted documents can be reviewed.');
    await tx.verificationCheck.update({ where: { id: c.id }, data: { status: decision, reviewNote: note.trim() || null, reviewerId: viewer.user.id, reviewedAt: new Date() } });
    if (decision === 'REJECTED') await notify({ userIds: await operatorMemberIds(c.operatorId, tx), type: 'verification.rejected', title: 'A verification document needs attention', body: note.trim(), link: '/operator/verification' }, tx);
    await audit({ actorUserId: viewer.user.id, action: `verification.${decision.toLowerCase()}`, entityType: 'VerificationCheck', entityId: c.id, after: { type: c.type, note } }, tx);
  });
}

/** Staff lifecycle changes with the business preconditions each state requires. */
export async function changeOperatorLifecycle(viewer: Viewer, operatorId: string, to: OperatorLifecycle, note: string) {
  if (!viewer.permissions.has('operator.lifecycle')) throw new AppError('FORBIDDEN', 'Not allowed.');
  return prisma.$transaction(async (tx) => {
    if (to === 'VERIFIED') {
      const accepted = await tx.verificationCheck.findMany({ where: { operatorId, status: 'ACCEPTED' } });
      const missing = REQUIRED_CHECKS.filter((t) => !accepted.some((a) => a.type === t));
      if (missing.length) throw new AppError('INVALID_STATE', `Accept these checks first: ${missing.join(', ')}.`);
      const auth = await tx.operatorAuthorization.findFirst({ where: { operatorId, numberStatus: 'VALID' } });
      if (!auth) throw new AppError('INVALID_STATE', 'Record a valid regulator certificate number first.');
      await tx.operatorAuthorization.update({ where: { id: auth.id }, data: { verifiedAt: new Date(), verifiedById: viewer.user.id } });
    }
    if (to === 'ACTIVE') {
      const agreement = await tx.agreement.findFirst({ where: { operatorId, status: 'SIGNED' } });
      if (!agreement) throw new AppError('INVALID_STATE', 'A signed agreement is required before activation.');
    }
    if (['SUSPENDED', 'EXCLUDED', 'REJECTED'].includes(to) && note.trim().length < 5) throw new AppError('VALIDATION', 'Give a reason.', { note: 'Required' });
    await setLifecycle(tx, operatorId, to, 'STAFF', viewer.user.id, note);
    const members = await operatorMemberIds(operatorId, tx);
    if (members.length) await notify({ userIds: members, type: 'operator.lifecycle', title: `Your ThePrivate status is now ${to.replace(/_/g, ' ').toLowerCase()}`, body: note || 'Status updated.', link: '/operator' }, tx);
  });
}

export async function setAuthorization(viewer: Viewer, operatorId: string, raw: { authority: 'DGCA' | 'GCAA'; number: string; validUntil: string }) {
  if (!viewer.permissions.has('verification.review')) throw new AppError('FORBIDDEN', 'Not allowed.');
  const number = raw.number.trim();
  if (number.length < 3) throw new AppError('VALIDATION', 'Enter the certificate number.', { number: 'Required' });
  const certificateType = raw.authority === 'DGCA' ? 'NSOP' : 'AOC';
  const data = { numberRaw: number, numberNormalized: number.toUpperCase(), numberStatus: 'VALID' as const, validUntil: raw.validUntil ? new Date(`${raw.validUntil}T00:00:00Z`) : null, source: 'ADMIN', verifiedAt: null, verifiedById: null };
  await prisma.operatorAuthorization.upsert({ where: { operatorId_authority_certificateType: { operatorId, authority: raw.authority, certificateType } }, create: { operatorId, authority: raw.authority, certificateType, ...data }, update: data });
  await audit({ actorUserId: viewer.user.id, action: 'operator.authorization.set', entityType: 'Operator', entityId: operatorId, after: raw });
}

export async function setPubliclyListed(viewer: Viewer, operatorId: string, listed: boolean) {
  if (!viewer.permissions.has('operator.lifecycle')) throw new AppError('FORBIDDEN', 'Not allowed.');
  const op = await prisma.operator.findUniqueOrThrow({ where: { id: operatorId } });
  if (listed && !['VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE'].includes(op.lifecycle)) throw new AppError('INVALID_STATE', 'Only verified operators can be listed publicly.');
  if (listed && !op.publicDescription) throw new AppError('INVALID_STATE', 'Add a public description before listing.');
  await prisma.operator.update({ where: { id: operatorId }, data: { isPubliclyListed: listed } });
  await audit({ actorUserId: viewer.user.id, action: 'operator.listing', entityType: 'Operator', entityId: operatorId, after: { listed } });
}

// ---- Agreements ---------------------------------------------------------------------------

export const agreementSchema = z.object({
  commissionBps: z.coerce.number().int().min(0).max(5000),
  minimumFee: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional().or(z.literal('')),
  currency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD']),
});

export async function issueAgreement(viewer: Viewer, operatorId: string, raw: unknown) {
  if (!viewer.permissions.has('agreement.manage')) throw new AppError('FORBIDDEN', 'Not allowed.');
  const input = agreementSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const op = await tx.operator.findUniqueOrThrow({ where: { id: operatorId } });
    if (op.lifecycle !== 'VERIFIED') throw new AppError('INVALID_STATE', 'Agreements are issued to VERIFIED operators.');
    await tx.agreement.updateMany({ where: { operatorId, status: { in: ['DRAFT', 'SENT'] } }, data: { status: 'TERMINATED' } });
    const last = await tx.agreement.findFirst({ where: { operatorId }, orderBy: { version: 'desc' } });
    const a = await tx.agreement.create({ data: { operatorId, version: (last?.version ?? 0) + 1, status: 'SENT', commissionBps: input.commissionBps, minimumFee: input.minimumFee ? new Prisma.Decimal(input.minimumFee) : null, currency: input.currency, effectiveFrom: new Date() } });
    await notify({ userIds: await operatorMemberIds(operatorId, tx), type: 'agreement.sent', title: 'Your ThePrivate agreement is ready', body: 'Review and accept the agreement to continue.', link: '/operator/agreement' }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'agreement.issue', entityType: 'Agreement', entityId: a.id, after: { version: a.version } }, tx);
  });
}

/** Click-through acceptance by an OWNER (recorded with name, time and IP) until e-signature is configured. */
export async function acceptAgreement(ctx: { viewer: Viewer; operatorId: string }, agreementId: string, typedName: string, ip: string | null) {
  if (typedName.trim().toLowerCase() !== ctx.viewer.user.name.trim().toLowerCase()) throw new AppError('VALIDATION', 'Type your full name exactly as on your account to sign.', { typedName: 'Must match your name' });
  return prisma.$transaction(async (tx) => {
    const a = await tx.agreement.findUnique({ where: { id: agreementId } });
    if (!a || a.operatorId !== ctx.operatorId || a.status !== 'SENT') throw new AppError('INVALID_STATE', 'This agreement cannot be accepted.');
    await tx.agreement.update({ where: { id: a.id }, data: { status: 'SIGNED', signedAt: new Date(), acceptedById: ctx.viewer.user.id, acceptedName: typedName.trim(), acceptedIp: ip } });
    await setLifecycle(tx, ctx.operatorId, 'AGREEMENT_SIGNED', 'OPERATOR', ctx.viewer.user.id, `Agreement v${a.version} accepted`);
    await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN'], tx), type: 'agreement.signed', title: 'Operator signed their agreement', body: 'Ready for activation.', link: `/admin/operators/${ctx.operatorId}` }, tx);
  });
}

// ---- Members ------------------------------------------------------------------------------

export async function addMember(ctx: { viewer: Viewer; operatorId: string }, email: string, role: 'MANAGER' | 'DISPATCHER' | 'VIEWER') {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new AppError('VALIDATION', 'Ask them to create a ThePrivate account first.', { email: 'No account with this e-mail' });
  await prisma.operatorMembership.upsert({ where: { operatorId_userId: { operatorId: ctx.operatorId, userId: user.id } }, create: { operatorId: ctx.operatorId, userId: user.id, role, status: 'ACTIVE', approvedById: ctx.viewer.user.id, approvedAt: new Date() }, update: { role, status: 'ACTIVE' } });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'operator.member.add', entityType: 'Operator', entityId: ctx.operatorId, after: { userId: user.id, role } });
}
