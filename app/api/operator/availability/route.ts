import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, nonNegativeNumber, positiveInt, readJson, requiredString, requireOperator, validDate } from "@/lib/api";

const allowedStatuses = new Set(["DRAFT", "ACTIVE", "PUBLISHED"]);

export async function GET(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    return NextResponse.json({
      availability: await db.availability.findMany({
        where: { operatorId: user.operatorId! },
        include: { aircraft: true },
        orderBy: { departureAt: "asc" },
        take: 100,
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
    const aircraftId = requiredString(body.aircraftId, "aircraftId");
    const aircraft = await db.aircraft.findFirst({ where: { id: aircraftId, operatorId: user.operatorId!, active: true } });
    if (!aircraft) return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });

    const status = typeof body.status === "string" && allowedStatuses.has(body.status) ? body.status : "PUBLISHED";
    const availability = await db.availability.create({
      data: {
        operatorId: user.operatorId!,
        aircraftId: aircraft.id,
        origin: requiredString(body.origin, "origin"),
        destination: requiredString(body.destination, "destination"),
        departureAt: validDate(body.departureAt, "departureAt"),
        price: Math.round(nonNegativeNumber(body.price, "price")),
        seats: positiveInt(body.seats || aircraft.seats || 1, "seats", aircraft.seats || 30),
        status: status as "DRAFT" | "ACTIVE" | "PUBLISHED",
        emptyLeg: Boolean(body.emptyLeg),
      },
    });
    return NextResponse.json({ availability });
  } catch (error) {
    return errorResponse(error);
  }
}
