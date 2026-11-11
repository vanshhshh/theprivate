import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { MembershipRole } from '@/generated/prisma/enums';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';
import { auth } from './auth';
import { permissionsFor, type Permission } from './permissions';

export const ACTIVE_OPERATOR_COOKIE = 'tp_operator';

/**
 * Resolves the signed-in user from request headers: a session cookie (website) or an
 * `Authorization: Bearer <session token>` header (mobile app, via Better Auth's bearer plugin).
 * Both resolve the same Session rows, so expiry, revocation and disabled accounts behave alike.
 */
export async function viewerFromHeaders(h: Headers) {
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      staffRoles: { where: { revokedAt: null } },
      memberships: { where: { status: 'ACTIVE' }, include: { operator: { select: { id: true, displayName: true, slug: true, lifecycle: true, countryCode: true } } } },
    },
  });
  if (!user || user.disabledAt || user.deletedAt) return null;
  const roles = user.staffRoles.map((r) => r.role);
  return { user, roles, permissions: permissionsFor(roles), memberships: user.memberships, isStaff: roles.length > 0 };
}

/** The signed-in user with roles, permissions and ACTIVE operator memberships (per request). */
export const getViewer = cache(async () => viewerFromHeaders(await headers()));

export type Viewer = NonNullable<Awaited<ReturnType<typeof viewerFromHeaders>>>;

/** Pages: redirect to sign-in. */
export async function requireViewerPage(next: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return v;
}

/** Actions/APIs: throw. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.');
  return v;
}

export function can(v: Viewer | null, p: Permission): boolean {
  return Boolean(v?.permissions.has(p));
}

export async function requirePermission(p: Permission): Promise<Viewer> {
  const v = await requireViewer();
  if (!v.permissions.has(p)) throw new AppError('FORBIDDEN', 'You do not have permission to do this.');
  return v;
}

export async function requirePermissionPage(p: Permission, next: string): Promise<Viewer> {
  const v = await requireViewerPage(next);
  if (!v.permissions.has(p)) redirect('/forbidden');
  return v;
}

const ROLE_RANK: Record<MembershipRole, number> = { VIEWER: 0, DISPATCHER: 1, MANAGER: 2, OWNER: 3 };

/** Current operator workspace for the viewer (selected via cookie, else first ACTIVE membership). */
export async function currentMembership(v: Viewer) {
  const selected = (await cookies()).get(ACTIVE_OPERATOR_COOKIE)?.value;
  return v.memberships.find((m) => m.operatorId === selected) ?? v.memberships[0] ?? null;
}

/** Requires an ACTIVE membership with at least `minRole`. Claims alone never satisfy this. */
export async function requireOperator(minRole: MembershipRole = 'VIEWER') {
  const v = await requireViewer();
  const m = await currentMembership(v);
  if (!m) throw new AppError('FORBIDDEN', 'You are not an approved member of an operator.');
  if (ROLE_RANK[m.role] < ROLE_RANK[minRole]) throw new AppError('FORBIDDEN', `This requires the ${minRole.toLowerCase()} role.`);
  return { viewer: v, membership: m, operatorId: m.operatorId };
}

export async function requireOperatorPage(next: string) {
  const v = await requireViewerPage(next);
  const m = await currentMembership(v);
  if (!m) redirect('/operator/onboarding');
  return { viewer: v, membership: m, operatorId: m.operatorId };
}

export function hasRole(role: MembershipRole, min: MembershipRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
