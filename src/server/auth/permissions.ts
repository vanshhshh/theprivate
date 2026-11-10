/**
 * Staff permission map. Reviewed in code, tested, and deliberately narrow: no role except
 * SUPER_ADMIN has everything. Role assignments live in the database (StaffRoleAssignment).
 */
import type { StaffRole } from '@/generated/prisma/enums';

export const PERMISSIONS = [
  'admin.access',
  'metrics.read',
  'operator.read',
  'operator.lifecycle',
  'operator.contacts.read',
  'operator.merge',
  'claim.review',
  'verification.review',
  'agreement.manage',
  'aircraft.read',
  'aircraft.review',
  'rfq.read',
  'rfq.route',
  'booking.read',
  'booking.manage',
  'payment.record_offline',
  'customer.read',
  'emptyleg.moderate',
  'sale.review',
  'sale.enquiries',
  'data.read',
  'data.resolve',
  'audit.read',
  'user.manage',
  'settings.manage',
  /** Company invitations: prepare, preview, test-send, revoke. */
  'invite.manage',
  /** Approve and release a LIVE invitation campaign (real recipients). */
  'invite.send',
  /** Company onboarding fee: view payments. */
  'onboarding_payment.read',
  /** Company onboarding fee: configure the fee, record refunds. Financial, audited. */
  'onboarding_payment.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  OPERATIONS: ['admin.access', 'metrics.read', 'operator.read', 'aircraft.read', 'rfq.read', 'rfq.route', 'booking.read', 'booking.manage', 'payment.record_offline', 'customer.read', 'emptyleg.moderate', 'onboarding_payment.read'],
  SUPPLY: ['admin.access', 'metrics.read', 'operator.read', 'operator.lifecycle', 'operator.contacts.read', 'claim.review', 'verification.review', 'agreement.manage', 'aircraft.read', 'aircraft.review', 'emptyleg.moderate', 'invite.manage', 'onboarding_payment.read'],
  SALES_DESK: ['admin.access', 'metrics.read', 'sale.review', 'sale.enquiries', 'customer.read'],
  DATA_STEWARD: ['admin.access', 'metrics.read', 'operator.read', 'operator.contacts.read', 'operator.merge', 'aircraft.read', 'data.read', 'data.resolve', 'audit.read'],
  SUPPORT: ['admin.access', 'operator.read', 'aircraft.read', 'rfq.read', 'booking.read', 'customer.read'],
};

export function permissionsFor(roles: readonly StaffRole[]): Set<Permission> {
  return new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r]));
}
