import 'server-only';
import { z } from 'zod';
import { saleListingLifecycle } from '@/domain/lifecycle';
import { slugify } from '@/domain/imports/normalize';
import { Prisma } from '@/generated/prisma/client';
import { AircraftCategory, BuyerEnquiryType, SellerType, type SaleListingStatus } from '@/generated/prisma/enums';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, staffWith } from '@/server/notifications';
import { storeUpload } from '@/server/storage';

const year = new Date().getUTCFullYear();

export const listingSchema = z
  .object({
    sellerType: z.enum(SellerType),
    category: z.enum(AircraftCategory),
    manufacturer: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(80),
    yearOfManufacture: z.coerce.number().int().min(1950, 'Year looks wrong').max(year + 1),
    registration: z.string().trim().max(12).optional(),
    serialNumber: z.string().trim().max(40).optional(),
    totalTimeHours: z.coerce.number().int().min(0).max(100000).optional().or(z.literal('').transform(() => undefined)),
    landings: z.coerce.number().int().min(0).max(200000).optional().or(z.literal('').transform(() => undefined)),
    locationText: z.string().trim().min(2).max(120),
    locationCountry: z.string().trim().length(2).optional().or(z.literal('')),
    currency: z.enum(['USD', 'INR', 'AED', 'EUR', 'GBP']),
    priceOnRequest: z.coerce.boolean().optional(),
    askingPrice: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional().or(z.literal('')),
    headline: z.string().trim().min(10, 'At least 10 characters').max(140),
    description: z.string().trim().min(40, 'Describe the aircraft (40+ characters)').max(8000),
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.email(),
    contactPhone: z.string().trim().max(30).optional(),
  })
  .refine((v) => v.priceOnRequest || v.askingPrice, { path: ['askingPrice'], message: 'Enter a price or choose price on request' });

/** Seller submission: never public until a staff member publishes it. Contact details stay private. */
export async function submitListing(viewer: Viewer, raw: unknown, photos: File[], documents: File[]) {
  const input = listingSchema.parse(raw);
  if (photos.length > 12) throw new AppError('VALIDATION', 'Up to 12 photos.');
  if (documents.length > 6) throw new AppError('VALIDATION', 'Up to 6 documents.');
  return prisma.$transaction(async (tx) => {
    const slug = `${slugify(`${input.yearOfManufacture} ${input.manufacturer} ${input.model}`)}-${Math.random().toString(36).slice(2, 7)}`;
    const listing = await tx.saleListing.create({
      data: {
        slug,
        sellerUserId: viewer.user.id,
        sellerType: input.sellerType,
        status: 'SUBMITTED',
        category: input.category,
        manufacturer: input.manufacturer,
        model: input.model,
        yearOfManufacture: input.yearOfManufacture,
        registration: input.registration?.toUpperCase() || null,
        serialNumber: input.serialNumber || null,
        totalTimeHours: input.totalTimeHours ?? null,
        landings: input.landings ?? null,
        locationText: input.locationText,
        locationCountry: input.locationCountry || null,
        currency: input.currency,
        priceOnRequest: Boolean(input.priceOnRequest),
        askingPrice: input.priceOnRequest || !input.askingPrice ? null : new Prisma.Decimal(input.askingPrice),
        headline: input.headline,
        description: input.description,
        contactName: input.contactName,
        contactEmail: input.contactEmail.toLowerCase(),
        contactPhone: input.contactPhone || null,
        reviewEvents: { create: { toStatus: 'SUBMITTED', actorUserId: viewer.user.id } },
        lead: { create: { name: input.contactName, email: input.contactEmail.toLowerCase(), phone: input.contactPhone || null } },
      },
    });
    let order = 0;
    for (const p of photos) {
      const doc = await storeUpload(p, { kind: 'SALE_LISTING_PHOTO', uploadedById: viewer.user.id, allowed: ['image'] }, tx);
      await tx.saleListingMedia.create({ data: { listingId: listing.id, documentId: doc.id, isPublic: false, sortOrder: order++ } });
    }
    for (const d of documents) {
      const doc = await storeUpload(d, { kind: 'SALE_LISTING_DOCUMENT', uploadedById: viewer.user.id, allowed: ['pdf', 'image'] }, tx);
      await tx.saleListingMedia.create({ data: { listingId: listing.id, documentId: doc.id, isPublic: false, sortOrder: 1000 + order++, caption: 'Document' } });
    }
    await notify({ userIds: await staffWith(['SALES_DESK', 'SUPER_ADMIN'], tx), type: 'sale.submitted', title: 'New aircraft-for-sale submission', body: input.headline, link: `/admin/sales/${listing.id}` }, tx);
    await notify({ userIds: [viewer.user.id], type: 'sale.received', title: 'Listing submitted for review', body: 'Our sales desk reviews every listing before it is published.', link: '/account/listings' }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'sale.submit', entityType: 'SaleListing', entityId: listing.id }, tx);
    return listing;
  });
}

export async function reviewListing(viewer: Viewer, id: string, to: Extract<SaleListingStatus, 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO' | 'WITHDRAWN' | 'SOLD'>, note: string) {
  if (!viewer.permissions.has('sale.review')) throw new AppError('FORBIDDEN', 'Not allowed.');
  if (to !== 'PUBLISHED' && note.trim().length < 5) throw new AppError('VALIDATION', 'Add a note for the seller.', { note: 'Required' });
  return prisma.$transaction(async (tx) => {
    const l = await tx.saleListing.findUnique({ where: { id } });
    if (!l) throw notFound('Listing');
    saleListingLifecycle.assert(l.status, to, 'STAFF');
    await tx.saleListing.update({ where: { id }, data: { status: to, ...(to === 'PUBLISHED' ? { publishedAt: new Date() } : {}) } });
    // Photos become public only when staff publish; documents never do.
    if (to === 'PUBLISHED') await tx.saleListingMedia.updateMany({ where: { listingId: id, caption: null }, data: { isPublic: true } });
    if (to !== 'PUBLISHED') await tx.saleListingMedia.updateMany({ where: { listingId: id }, data: { isPublic: false } });
    await tx.listingReviewEvent.create({ data: { listingId: id, fromStatus: l.status, toStatus: to, actorUserId: viewer.user.id, note: note.trim() || null } });
    if (to === 'PUBLISHED') await tx.sellerLead.updateMany({ where: { listingId: id }, data: { stage: 'LISTED' } });
    await notify({ userIds: [l.sellerUserId], type: `sale.${to.toLowerCase()}`, title: to === 'PUBLISHED' ? 'Your listing is live' : to === 'NEEDS_INFO' ? 'Your listing needs more information' : `Listing ${to.toLowerCase()}`, body: note.trim() || 'Your aircraft is now visible to buyers.', link: '/account/listings' }, tx);
    await audit({ actorUserId: viewer.user.id, action: `sale.${to.toLowerCase()}`, entityType: 'SaleListing', entityId: id, before: { status: l.status }, after: { note } }, tx);
  });
}

export async function sellerUpdateStatus(viewer: Viewer, id: string, to: 'SUBMITTED' | 'WITHDRAWN' | 'SOLD') {
  const l = await prisma.saleListing.findUnique({ where: { id } });
  if (!l || l.sellerUserId !== viewer.user.id) throw notFound('Listing');
  saleListingLifecycle.assert(l.status, to, 'CUSTOMER');
  await prisma.$transaction([
    prisma.saleListing.update({ where: { id }, data: { status: to } }),
    prisma.listingReviewEvent.create({ data: { listingId: id, fromStatus: l.status, toStatus: to, actorUserId: viewer.user.id } }),
    ...(to !== 'SUBMITTED' ? [prisma.saleListingMedia.updateMany({ where: { listingId: id }, data: { isPublic: false } })] : []),
  ]);
}

// ---- Public marketplace ----------------------------------------------------------------------

const publicListingSelect = {
  id: true, slug: true, category: true, manufacturer: true, model: true, yearOfManufacture: true, registration: true, serialNumber: true,
  totalTimeHours: true, landings: true, locationText: true, locationCountry: true, currency: true, askingPrice: true, priceOnRequest: true,
  headline: true, description: true, sellerType: true, publishedAt: true,
  media: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' as const }, select: { documentId: true, caption: true } },
} as const;

export const marketFilterSchema = z.object({
  category: z.enum(AircraftCategory).optional().catch(undefined),
  manufacturer: z.string().max(80).optional(),
  minYear: z.coerce.number().int().optional().catch(undefined),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'year_desc']).optional().catch('newest'),
  page: z.coerce.number().int().min(1).optional().catch(1),
});

export async function listPublishedListings(raw: unknown) {
  const f = marketFilterSchema.parse(raw);
  const where = {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(f.category ? { category: f.category } : {}),
    ...(f.manufacturer ? { manufacturer: { contains: f.manufacturer, mode: 'insensitive' as const } } : {}),
    ...(f.minYear ? { yearOfManufacture: { gte: f.minYear } } : {}),
  };
  const orderBy =
    f.sort === 'price_asc' ? [{ askingPrice: { sort: 'asc' as const, nulls: 'last' as const } }]
    : f.sort === 'price_desc' ? [{ askingPrice: { sort: 'desc' as const, nulls: 'last' as const } }]
    : f.sort === 'year_desc' ? [{ yearOfManufacture: 'desc' as const }]
    : [{ publishedAt: 'desc' as const }];
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([prisma.saleListing.findMany({ where, select: publicListingSelect, orderBy, take: 18, skip: (page - 1) * 18 }), prisma.saleListing.count({ where })]);
  return { items, total, page, filters: f };
}

export async function getPublishedListing(idOrSlug: string) {
  return prisma.saleListing.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: 'PUBLISHED', deletedAt: null }, select: publicListingSelect });
}

export const enquirySchema = z.object({
  type: z.enum(BuyerEnquiryType),
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10, 'Tell the seller a little more').max(3000),
});

/** Buyer enquiry. Routed through the sales desk: the seller's contact details are never exposed. */
export async function submitBuyerEnquiry(viewer: Viewer | null, listingId: string, raw: unknown) {
  const input = enquirySchema.parse(raw);
  const l = await prisma.saleListing.findFirst({ where: { id: listingId, status: 'PUBLISHED' } });
  if (!l) throw new AppError('INVALID_STATE', 'This listing is not available.');
  const recent = await prisma.buyerEnquiry.count({ where: { email: input.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= 5) throw new AppError('RATE_LIMITED', 'Too many enquiries. Please try again later.');
  return prisma.$transaction(async (tx) => {
    const e = await tx.buyerEnquiry.create({ data: { listingId, userId: viewer?.user.id ?? null, type: input.type, name: input.name, email: input.email.toLowerCase(), phone: input.phone || null, message: input.message } });
    await notify({ userIds: [l.sellerUserId], type: 'sale.enquiry', title: 'New buyer enquiry', body: `${input.type.replace(/_/g, ' ').toLowerCase()} for ${l.headline}. Our desk will connect you.`, link: '/account/listings' }, tx);
    await notify({ userIds: await staffWith(['SALES_DESK', 'SUPER_ADMIN'], tx), type: 'sale.enquiry', title: 'New buyer enquiry', body: l.headline, link: `/admin/sales/${l.id}` }, tx);
    return e;
  });
}

export async function myListings(userId: string) {
  return prisma.saleListing.findMany({ where: { sellerUserId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { enquiries: true } }, reviewEvents: { orderBy: { createdAt: 'desc' }, take: 1 } } });
}
