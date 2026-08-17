import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, nonNegativeNumber, readJson, requiredString, requireOperator } from "@/lib/api";
import { notifyUser } from "@/lib/notifications";
import { calculateAircraftPrice } from "@/lib/pricing";
import { QuoteStatus, RfqStatus } from "@/app/generated/prisma/enums";

export async function GET(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    return NextResponse.json({
      quotes: await db.quote.findMany({
        where: { operatorId: user.operatorId! },
        include: { rfq: true, aircraft: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    const body = await readJson(req);
    const rfqId = requiredString(body.rfqId, "rfqId");
    const rfq = await db.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

    const aircraft = body.aircraftId
      ? await db.aircraft.findFirst({ where: { id: String(body.aircraftId), operatorId: user.operatorId!, active: true } })
      : await db.aircraft.findFirst({
          where: { operatorId: user.operatorId!, active: true, seats: { gte: rfq.passengers } },
          orderBy: { seats: "asc" },
        });
    if (!aircraft) return NextResponse.json({ error: "No eligible aircraft available" }, { status: 409 });

    const withPricing = await db.aircraft.findUnique({
      where: { id: aircraft.id },
      include: { operator: { include: { pricing: true } } },
    });
    const suggested = withPricing ? (await calculateAircraftPrice(withPricing, rfq.origin, rfq.destination)).finalPrice : 0;
    const submitted = nonNegativeNumber(body.price, "price", suggested);
    const price = submitted > 0 ? submitted : suggested;
    const validUntil = body.validUntil ? new Date(String(body.validUntil)) : new Date(Date.now() + 86400000);
    if (!Number.isFinite(validUntil.getTime())) return NextResponse.json({ error: "validUntil is invalid" }, { status: 400 });

    const quote = await db.quote.create({
      data: {
        rfqId: rfq.id,
        operatorId: user.operatorId!,
        aircraftId: aircraft.id,
        price,
        validUntil,
        status: QuoteStatus.ACTIVE,
      },
    });
    await db.rfq.update({ where: { id: rfq.id }, data: { status: RfqStatus.QUOTED } });
    await notifyUser(rfq.userId, "New charter quote", `A new quote is available for ${rfq.origin} to ${rfq.destination}.`, "RFQ");
    return NextResponse.json({ quote });
  } catch (error) {
    return errorResponse(error);
  }
}
