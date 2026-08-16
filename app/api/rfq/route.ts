import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, positiveInt, readJson, requiredString, requireUser, validDate } from "@/lib/api";
import { notifyOperator, notifyUser } from "@/lib/notifications";
import { isInternational } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const origin = requiredString(body.origin, "origin");
    const destination = requiredString(body.destination, "destination");
    const departureAt = validDate(body.departureAt, "departureAt");
    const passengers = positiveInt(body.passengers, "passengers", 30);
    const international = isInternational(origin, destination);

    const rfq = await db.rfq.create({
      data: {
        userId: user.id,
        origin,
        destination,
        departureAt,
        passengers,
        notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      },
    });

    const eligible = await db.operator.findMany({
      where: {
        active: true,
        verified: true,
        ...(international ? { internationalCapability: { not: null } } : {}),
        aircraft: { some: { active: true, seats: { gte: passengers } } },
      },
      select: { id: true, name: true },
      take: 50,
    });

    for (const operator of eligible) {
      await notifyOperator(operator.id, "New charter request", `${origin} to ${destination}, ${passengers} passengers.`, "RFQ");
    }
    await notifyUser(user.id, "Quote request sent", "We will bring back suitable options.", "RFQ");
    return NextResponse.json({ rfq, matchedOperators: eligible.length });
  } catch (error) {
    return errorResponse(error);
  }
}
