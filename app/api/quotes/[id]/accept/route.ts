import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/api";
import { notifyOperator } from "@/lib/notifications";
import { BookingStatus, QuoteStatus, RfqStatus } from "@/app/generated/prisma/enums";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser(req);
    const { id } = await params;
    const q = await db.quote.findUnique({ where: { id }, include: { rfq: true, operator: true, aircraft: true } });
    if (!q || q.rfq.userId !== u.id) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (q.validUntil < new Date()) return NextResponse.json({ error: "Quote expired" }, { status: 409 });

    const b = await db.booking.create({
      data: {
        userId: u.id,
        operatorId: q.operatorId,
        aircraftId: q.aircraftId,
        rfqId: q.rfqId,
        quoteId: q.id,
        origin: q.rfq.origin,
        destination: q.rfq.destination,
        departureAt: q.rfq.departureAt,
        passengers: q.rfq.passengers,
        price: q.price,
        status: BookingStatus.REQUESTED,
      },
    });

    await db.$transaction([
      db.quote.update({ where: { id: q.id }, data: { status: QuoteStatus.ACCEPTED } }),
      db.rfq.update({ where: { id: q.rfqId }, data: { status: RfqStatus.AWARDED } }),
    ]);

    await notifyOperator(q.operatorId, "Quote selected", `${u.name} selected your quote for ${q.rfq.origin} → ${q.rfq.destination}.`, "BOOKING");
    return NextResponse.json({ booking: b });
  } catch (e) {
    return errorResponse(e);
  }
}
