import { NextResponse } from 'next/server';
import { getViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { readStored } from '@/server/storage';

/**
 * Authorised file delivery. Public only when the file is a photo of a PUBLISHED sale listing or
 * an APPROVED aircraft of an ACTIVE operator; otherwise the requester must be the uploader, a
 * member of the owning operator, the listing's seller, or staff.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      saleMedia: { include: { listing: { select: { status: true, sellerUserId: true } } } },
      aircraftImages: { include: { aircraft: { select: { reviewStatus: true, operatorId: true, operator: { select: { lifecycle: true } } } } } },
      operatorDocs: { select: { operatorId: true } },
    },
  });
  if (!doc || doc.deletedAt) return new NextResponse('Not found', { status: 404 });

  const isPublic =
    doc.saleMedia.some((m) => m.isPublic && m.listing.status === 'PUBLISHED') ||
    doc.aircraftImages.some((i) => i.isApproved && i.aircraft.reviewStatus === 'APPROVED' && i.aircraft.operator.lifecycle === 'ACTIVE');

  if (!isPublic) {
    const v = await getViewer();
    if (!v) return new NextResponse('Not found', { status: 404 });
    const memberOf = new Set(v.memberships.map((m) => m.operatorId));
    const allowed =
      doc.uploadedById === v.user.id ||
      v.isStaff ||
      doc.saleMedia.some((m) => m.listing.sellerUserId === v.user.id) ||
      doc.aircraftImages.some((i) => memberOf.has(i.aircraft.operatorId)) ||
      doc.operatorDocs.some((o) => memberOf.has(o.operatorId));
    if (!allowed) return new NextResponse('Not found', { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readStored(doc.storageKey);
  } catch (err) {
    // A record whose stored file is gone (e.g. storage moved or cleaned up) is "not found", not a crash.
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT' || (err as { name?: string })?.name === 'NoSuchKey') return new NextResponse('Not found', { status: 404 });
    throw err;
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `${doc.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename="${doc.fileName.replace(/"/g, '')}"`,
      'Cache-Control': isPublic ? 'public, max-age=3600' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
