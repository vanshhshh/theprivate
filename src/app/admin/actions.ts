'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/components/ui/form';
import { OperatorLifecycle, StaffRole } from '@/generated/prisma/enums';
import { runAction } from '@/server/action';
import { audit } from '@/server/audit';
import { requirePermission } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';
import { decideMatch, grantRole, resolveConflict, revokeRole, setUserDisabled, updateAircraftTypeSpecs } from '@/server/services/admin';
import { cancelBooking, recordOfflineSettlement } from '@/server/services/bookings';
import { changeEmptyLegStatus } from '@/server/services/empty-legs';
import { reviewAircraft } from '@/server/services/fleet';
import { changeOperatorLifecycle, issueAgreement, reviewCheck, reviewClaim, setAuthorization, setPubliclyListed } from '@/server/services/operators';
import { routeRfq } from '@/server/services/rfq';
import { reviewListing } from '@/server/services/sales';
import { setSetting } from '@/server/settings';

const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => !k.startsWith('$ACTION') && typeof v === 'string'));
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '');

function done(path: string) {
  revalidatePath(path);
}

export async function claimDecisionAction(_: FormState, fd: FormData): Promise<FormState> {
  const decision = z.enum(['APPROVED', 'REJECTED', 'NEEDS_INFO']).parse(fd.get('decision'));
  const res = await runAction(async () => reviewClaim(await requirePermission('claim.review'), s(fd, 'id'), decision, s(fd, 'note')), 'Decision recorded.');
  done('/admin/claims');
  return res;
}

export async function lifecycleAction(_: FormState, fd: FormData): Promise<FormState> {
  const to = z.enum(OperatorLifecycle).parse(fd.get('to'));
  const res = await runAction(async () => changeOperatorLifecycle(await requirePermission('operator.lifecycle'), s(fd, 'id'), to, s(fd, 'note')), `Operator moved to ${to.toLowerCase().replace(/_/g, ' ')}.`);
  done(`/admin/operators/${s(fd, 'id')}`);
  return res;
}

export async function authorizationAction(_: FormState, fd: FormData): Promise<FormState> {
  const authority = z.enum(['DGCA', 'GCAA']).parse(fd.get('authority'));
  const res = await runAction(async () => setAuthorization(await requirePermission('verification.review'), s(fd, 'id'), { authority, number: s(fd, 'number'), validUntil: s(fd, 'validUntil') }), 'Certificate recorded.');
  done(`/admin/operators/${s(fd, 'id')}`);
  return res;
}

export async function checkReviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const decision = z.enum(['ACCEPTED', 'REJECTED']).parse(fd.get('decision'));
  const res = await runAction(async () => reviewCheck(await requirePermission('verification.review'), s(fd, 'checkId'), decision, s(fd, 'note')), 'Check reviewed.');
  done(`/admin/operators/${s(fd, 'id')}`);
  return res;
}

export async function agreementAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => issueAgreement(await requirePermission('agreement.manage'), s(fd, 'id'), obj(fd)), 'Agreement issued to the operator.');
  done(`/admin/operators/${s(fd, 'id')}`);
  return res;
}

export async function listingToggleAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => setPubliclyListed(await requirePermission('operator.lifecycle'), s(fd, 'id'), s(fd, 'listed') === 'true'), 'Directory visibility updated.');
  done(`/admin/operators/${s(fd, 'id')}`);
  return res;
}

export async function aircraftReviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const decision = z.enum(['APPROVED', 'REJECTED']).parse(fd.get('decision'));
  const res = await runAction(async () => reviewAircraft(await requirePermission('aircraft.review'), s(fd, 'id'), decision, { charterEligible: fd.get('charterEligible') === 'true', note: s(fd, 'note') }), 'Review recorded.');
  done(`/admin/aircraft/${s(fd, 'id')}`);
  return res;
}

export async function typeSpecsAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => updateAircraftTypeSpecs(await requirePermission('aircraft.review'), s(fd, 'id'), obj(fd)), 'Specifications saved with citation.');
  done('/admin/data/types');
  return res;
}

export async function routeRfqAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => routeRfq(await requirePermission('rfq.route'), s(fd, 'rfqId'), s(fd, 'operatorId')), 'Request routed.');
  done(`/admin/requests/${s(fd, 'reference')}`);
  return res;
}

export async function settlementAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => recordOfflineSettlement(await requirePermission('payment.record_offline'), s(fd, 'reference'), obj(fd)), 'Settlement recorded. Booking is now paid.');
  done(`/admin/bookings/${s(fd, 'reference')}`);
  return res;
}

export async function staffCancelBookingAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => cancelBooking(await requirePermission('booking.manage'), s(fd, 'reference'), s(fd, 'reason'), 'STAFF'), 'Booking cancelled.');
  done(`/admin/bookings/${s(fd, 'reference')}`);
  return res;
}

export async function emptyLegModerateAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => changeEmptyLegStatus(await requirePermission('emptyleg.moderate'), s(fd, 'id'), 'WITHDRAWN', 'STAFF'), 'Listing withdrawn.');
  done('/admin/empty-legs');
  return res;
}

export async function saleReviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const to = z.enum(['PUBLISHED', 'REJECTED', 'NEEDS_INFO', 'WITHDRAWN', 'SOLD']).parse(fd.get('to'));
  const res = await runAction(async () => reviewListing(await requirePermission('sale.review'), s(fd, 'id'), to, s(fd, 'note')), 'Listing updated.');
  done(`/admin/sales/${s(fd, 'id')}`);
  return res;
}

export async function enquiryStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  const status = z.enum(['NEW', 'FORWARDED', 'RESPONDED', 'CONVERTED', 'CLOSED']).parse(fd.get('status'));
  const res = await runAction(async () => {
    const v = await requirePermission('sale.enquiries');
    await prisma.buyerEnquiry.update({ where: { id: s(fd, 'enquiryId') }, data: { status } });
    await audit({ actorUserId: v.user.id, action: 'sale.enquiry.status', entityType: 'BuyerEnquiry', entityId: s(fd, 'enquiryId'), after: { status } });
  }, 'Enquiry updated.');
  done(`/admin/sales/${s(fd, 'id')}`);
  return res;
}

export async function leadStageAction(_: FormState, fd: FormData): Promise<FormState> {
  const stage = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'LISTED', 'CLOSED_WON', 'CLOSED_LOST']).parse(fd.get('stage'));
  const res = await runAction(async () => {
    const v = await requirePermission('sale.enquiries');
    await prisma.sellerLead.update({ where: { id: s(fd, 'leadId') }, data: { stage, notes: s(fd, 'notes') || undefined, ownerStaffId: v.user.id } });
  }, 'Lead updated.');
  done(`/admin/sales/${s(fd, 'id')}`);
  return res;
}

export async function roleGrantAction(_: FormState, fd: FormData): Promise<FormState> {
  const role = z.enum(StaffRole).parse(fd.get('role'));
  const res = await runAction(async () => grantRole(await requirePermission('user.manage'), s(fd, 'email'), role), 'Role granted.');
  done('/admin/users');
  return res;
}

export async function roleRevokeAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => revokeRole(await requirePermission('user.manage'), s(fd, 'assignmentId')), 'Role revoked.');
  done('/admin/users');
  return res;
}

export async function userDisableAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => setUserDisabled(await requirePermission('user.manage'), s(fd, 'userId'), s(fd, 'disabled') === 'true'), 'User updated.');
  done('/admin/users');
  return res;
}

export async function conflictAction(_: FormState, fd: FormData): Promise<FormState> {
  const chosen = s(fd, 'chosen');
  const action = chosen ? 'RESOLVED' : 'DISMISSED';
  const res = await runAction(async () => resolveConflict(await requirePermission('data.resolve'), s(fd, 'id'), action, chosen || null, s(fd, 'note')), action === 'RESOLVED' ? 'Conflict resolved.' : 'Conflict dismissed.');
  done('/admin/data/conflicts');
  return res;
}

export async function matchAction(_: FormState, fd: FormData): Promise<FormState> {
  const decision = z.enum(['CONFIRMED_SAME', 'CONFIRMED_DISTINCT']).parse(fd.get('decision'));
  const res = await runAction(async () => decideMatch(await requirePermission(decision === 'CONFIRMED_SAME' ? 'operator.merge' : 'data.resolve'), s(fd, 'id'), decision, fd.get('keep') ? s(fd, 'keep') : null, s(fd, 'note')), decision === 'CONFIRMED_SAME' ? 'Records merged.' : 'Marked as distinct.');
  done('/admin/data/matches');
  return res;
}

export async function messageHandledAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const v = await requirePermission('customer.read');
    await prisma.contactMessage.update({ where: { id: s(fd, 'id') }, data: { handledAt: new Date(), handledById: v.user.id } });
  }, 'Marked handled.');
  done('/admin/messages');
  return res;
}

export async function settingAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const v = await requirePermission('settings.manage');
    const key = s(fd, 'key') as Parameters<typeof setSetting>[0];
    let value: unknown;
    try {
      value = JSON.parse(s(fd, 'value'));
    } catch {
      throw new AppError('VALIDATION', 'Value must be valid JSON.', { value: 'Invalid JSON' });
    }
    const saved = await setSetting(key, value, v.user.id);
    await audit({ actorUserId: v.user.id, action: 'settings.update', entityType: 'SystemSetting', entityId: key, after: saved });
  }, 'Setting saved.');
  done('/admin/settings');
  return res;
}
