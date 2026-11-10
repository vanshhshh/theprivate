import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db/client';
import { LIVE_EMPTY_LEG_WHERE } from '@/server/services/empty-legs';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  const [listings, operators, legs] = await Promise.all([
    prisma.saleListing.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.operator.findMany({ where: { isPubliclyListed: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.emptyLegListing.findMany({ where: LIVE_EMPTY_LEG_WHERE(), select: { id: true, updatedAt: true } }),
  ]);
  const statics = ['', '/charter', '/empty-legs', '/aircraft-for-sale', '/operators', '/for-operators', '/about', '/contact', '/sell-aircraft', '/legal/terms', '/legal/privacy'];
  return [
    ...statics.map((p) => ({ url: `${base}${p}` })),
    ...listings.map((l) => ({ url: `${base}/aircraft-for-sale/${l.slug}`, lastModified: l.updatedAt })),
    ...operators.map((o) => ({ url: `${base}/operators/${o.slug}`, lastModified: o.updatedAt })),
    ...legs.map((l) => ({ url: `${base}/empty-legs/${l.id}`, lastModified: l.updatedAt })),
  ];
}
