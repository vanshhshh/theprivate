import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import type { StaffRole } from '@/generated/prisma/enums';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';

function need(v: Viewer, p: Parameters<Viewer['permissions']['has']>[0]) {
  if (!v.permissions.has(p)) throw new AppError('FORBIDDEN', 'Not allowed.');
}

/** Every number here is a live COUNT from the database. Nothing is estimated. */
export async function overviewMetrics() {
  const [operatorsByStage, aircraftByReview, openRfqs, unmatchedRfqs, pendingBookings, awaitingPayment, openClaims, submittedAircraft, submittedListings, openConflicts, pendingMatches, liveEmptyLegs, publishedListings, customers] = await Promise.all([
    prisma.operator.groupBy({ by: ['lifecycle'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.aircraft.groupBy({ by: ['reviewStatus'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.rfq.count({ where: { status: { in: ['MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'] } } }),
    prisma.rfq.count({ where: { status: 'MATCHING' } }),
    prisma.booking.count({ where: { status: 'PENDING_OPERATOR_CONFIRMATION' } }),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'PAYMENT_PENDING'] } } }),
    prisma.operatorClaim.count({ where: { status: { in: ['SUBMITTED', 'NEEDS_INFO'] } } }),
    prisma.aircraft.count({ where: { reviewStatus: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
    prisma.saleListing.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
    prisma.dataConflict.count({ where: { status: 'OPEN' } }),
    prisma.matchCandidate.count({ where: { status: 'PENDING' } }),
    prisma.emptyLegListing.count({ where: { status: 'PUBLISHED', validUntil: { gt: new Date() } } }),
    prisma.saleListing.count({ where: { status: 'PUBLISHED' } }),
    prisma.user.count({ where: { deletedAt: null, staffRoles: { none: { revokedAt: null } }, memberships: { none: { status: 'ACTIVE' } } } }),
  ]);
  return {
    operatorsByStage: Object.fromEntries(operatorsByStage.map((g) => [g.lifecycle, g._count._all])) as Record<string, number>,
    aircraftByReview: Object.fromEntries(aircraftByReview.map((g) => [g.reviewStatus, g._count._all])) as Record<string, number>,
    openRfqs, unmatchedRfqs, pendingBookings, awaitingPayment, openClaims, submittedAircraft, submittedListings, openConflicts, pendingMatches, liveEmptyLegs, publishedListings, customers,
  };
}

// ---- Users & roles ------------------------------------------------------------------------

export async function grantRole(viewer: Viewer, email: string, role: StaffRole) {
  need(viewer, 'user.manage');
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new AppError('VALIDATION', 'No user with that e-mail.', { email: 'Not found' });
  const has = await prisma.staffRoleAssignment.findFirst({ where: { userId: user.id, role, revokedAt: null } });
  if (has) throw new AppError('CONFLICT', 'User already has this role.');
  const a = await prisma.staffRoleAssignment.create({ data: { userId: user.id, role, grantedById: viewer.user.id } });
  await audit({ actorUserId: viewer.user.id, action: 'role.grant', entityType: 'User', entityId: user.id, after: { role } });
  return a;
}

export async function revokeRole(viewer: Viewer, assignmentId: string) {
  need(viewer, 'user.manage');
  const a = await prisma.staffRoleAssignment.findUnique({ where: { id: assignmentId } });
  if (!a || a.revokedAt) throw notFound('Role');
  if (a.role === 'SUPER_ADMIN') {
    const supers = await prisma.staffRoleAssignment.count({ where: { role: 'SUPER_ADMIN', revokedAt: null } });
    if (supers <= 1) throw new AppError('INVALID_STATE', 'Cannot revoke the last super admin.');
  }
  await prisma.staffRoleAssignment.update({ where: { id: a.id }, data: { revokedAt: new Date() } });
  await audit({ actorUserId: viewer.user.id, action: 'role.revoke', entityType: 'User', entityId: a.userId, before: { role: a.role } });
}

export async function setUserDisabled(viewer: Viewer, userId: string, disabled: boolean) {
  need(viewer, 'user.manage');
  if (userId === viewer.user.id) throw new AppError('INVALID_STATE', 'You cannot disable yourself.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } }),
    ...(disabled ? [prisma.session.deleteMany({ where: { userId } })] : []),
  ]);
  await audit({ actorUserId: viewer.user.id, action: disabled ? 'user.disable' : 'user.enable', entityType: 'User', entityId: userId });
}

// ---- Data stewardship -----------------------------------------------------------------------

export async function resolveConflict(viewer: Viewer, id: string, action: 'RESOLVED' | 'DISMISSED', chosen: string | null, note: string) {
  need(viewer, 'data.resolve');
  if (note.trim().length < 5) throw new AppError('VALIDATION', 'Record why.', { note: 'Required' });
  const c = await prisma.dataConflict.findUnique({ where: { id } });
  if (!c) throw notFound('Conflict');
  if (!['OPEN', 'AUTO_RESOLVED'].includes(c.status)) throw new AppError('INVALID_STATE', 'Already reviewed.');
  await prisma.dataConflict.update({ where: { id }, data: { status: action, chosenValue: chosen === null ? Prisma.JsonNull : chosen, resolvedById: viewer.user.id, resolvedAt: new Date(), resolutionNote: note.trim() } });
  await audit({ actorUserId: viewer.user.id, action: `data.conflict.${action.toLowerCase()}`, entityType: 'DataConflict', entityId: id, before: { status: c.status }, after: { chosen, note } });
}

/**
 * Confirm or reject an identity candidate. CONFIRMED_SAME merges the source operator INTO the
 * target: aircraft, fleet evidence, contacts, aliases, registry links and external identifiers
 * move; the source is soft-deleted. Refused if the source has commercial activity or members.
 */
export async function decideMatch(viewer: Viewer, id: string, decision: 'CONFIRMED_SAME' | 'CONFIRMED_DISTINCT', keepKey: string | null, note: string) {
  need(viewer, decision === 'CONFIRMED_SAME' ? 'operator.merge' : 'data.resolve');
  if (note.trim().length < 5) throw new AppError('VALIDATION', 'Record why.', { note: 'Required' });
  return prisma.$transaction(async (tx) => {
    const m = await tx.matchCandidate.findUnique({ where: { id } });
    if (!m || m.status !== 'PENDING') throw new AppError('INVALID_STATE', 'Already decided.');
    if (decision === 'CONFIRMED_SAME') {
      if (keepKey !== m.leftKey && keepKey !== m.rightKey) throw new AppError('VALIDATION', 'Choose which record to keep.');
      const dropKey = keepKey === m.leftKey ? m.rightKey : m.leftKey;
      const ids = async (k: string) => {
        const [ns, ...rest] = k.split(':');
        return (await tx.externalIdentifier.findUnique({ where: { namespace_value: { namespace: ns!, value: rest.join(':') } } }))?.entityId;
      };
      const keepId = await ids(keepKey!);
      const dropId = await ids(dropKey);
      if (!keepId || !dropId) throw notFound('Operator');
      const activity = await tx.operator.findUniqueOrThrow({ where: { id: dropId }, include: { _count: { select: { memberships: true, quotes: true, bookings: true, emptyLegs: true, rfqRecipients: true } } } });
      if (Object.values(activity._count).some((n) => n > 0)) throw new AppError('INVALID_STATE', 'The record to merge away has members or commercial activity; merge manually.');
      await tx.aircraft.updateMany({ where: { operatorId: dropId }, data: { operatorId: keepId } });
      await tx.fleetEvidence.updateMany({ where: { operatorId: dropId }, data: { operatorId: keepId } });
      await tx.operatorContact.updateMany({ where: { operatorId: dropId }, data: { operatorId: keepId } });
      await tx.authorityRegistryEntry.updateMany({ where: { operatorId: dropId }, data: { operatorId: keepId } });
      const aliases = await tx.operatorAlias.findMany({ where: { operatorId: dropId } });
      for (const a of aliases) await tx.operatorAlias.upsert({ where: { operatorId_alias: { operatorId: keepId, alias: a.alias } }, create: { operatorId: keepId, alias: a.alias, matchKey: a.matchKey, source: a.source }, update: {} });
      await tx.operatorAlias.deleteMany({ where: { operatorId: dropId } });
      await tx.externalIdentifier.updateMany({ where: { entityType: 'Operator', entityId: dropId }, data: { entityId: keepId } });
      const kept = await tx.operator.findUniqueOrThrow({ where: { id: keepId } });
      await tx.operator.update({ where: { id: keepId }, data: { dataQualityFlags: [...new Set([...kept.dataQualityFlags, `MERGED_FROM:${dropKey}`])] } });
      await tx.operator.update({ where: { id: dropId }, data: { deletedAt: new Date(), lifecycle: 'EXCLUDED', dataQualityFlags: { push: `MERGED_INTO:${keepKey}` } } });
      await audit({ actorUserId: viewer.user.id, action: 'operator.merge', entityType: 'Operator', entityId: keepId, after: { mergedFrom: dropId, candidate: id, note } }, tx);
    }
    await tx.matchCandidate.update({ where: { id }, data: { status: decision, reviewedById: viewer.user.id, reviewedAt: new Date(), note: note.trim() } });
    await audit({ actorUserId: viewer.user.id, action: `data.match.${decision.toLowerCase()}`, entityType: 'MatchCandidate', entityId: id, after: { keepKey, note } }, tx);
  });
}

/** Staff can set or correct a type's specs, but only with a citation. */
export async function updateAircraftTypeSpecs(viewer: Viewer, id: string, raw: { typicalSeats?: string; rangeNm?: string; cruiseKtas?: string; specsSource?: string }) {
  need(viewer, 'aircraft.review');
  const n = (s?: string) => (s && s.trim() ? Number(s) : null);
  const data = { typicalSeats: n(raw.typicalSeats), rangeNm: n(raw.rangeNm), cruiseKtas: n(raw.cruiseKtas), specsSource: raw.specsSource?.trim() || null };
  if (Object.values(data).some((v) => typeof v === 'number' && (!Number.isInteger(v) || v <= 0))) throw new AppError('VALIDATION', 'Specs must be positive whole numbers.');
  if ((data.typicalSeats || data.rangeNm || data.cruiseKtas) && (!data.specsSource || data.specsSource.length < 8)) throw new AppError('VALIDATION', 'Cite the source of these specifications.', { specsSource: 'Required' });
  const before = await prisma.aircraftType.findUniqueOrThrow({ where: { id } });
  await prisma.aircraftType.update({ where: { id }, data });
  await audit({ actorUserId: viewer.user.id, action: 'aircraft_type.specs', entityType: 'AircraftType', entityId: id, before: { rangeNm: before.rangeNm, cruiseKtas: before.cruiseKtas, typicalSeats: before.typicalSeats }, after: data });
}
