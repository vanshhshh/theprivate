import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { positiveInt, readJson, requiredString, requireUser, errorResponse, validDate } from "@/lib/api";
import { notifyOperator } from "@/lib/notifications";
import { calculateAircraftPrice } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const where =
      user.role === "ADMIN"
        ? {}
        : user.role === "OPERATOR" && user.operatorId
          ? { operatorId: user.operatorId }
          : { userId: user.id };

    return NextResponse.json({
      bookings: await db.booking.findMany({
        where,
        include: { aircraft: true, operator: true, availability: true, quote: true },
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
    const user = await requireUser(req);
    const body = await readJson(req);
    const aircraftId = requiredString(body.aircraftId, "aircraftId");
    const origin = requiredString(body.origin, "origin");
    const destination = requiredString(body.destination, "destination");
    const departureAt = validDate(body.departureAt, "departureAt");
    const passengers = positiveInt(body.passengers, "passengers", 30);

    const aircraft = await db.aircraft.findUnique({
      where: { id: aircraftId },
      include: { operator: { include: { pricing: true } } },
    });
    if (!aircraft || !aircraft.active || !aircraft.operator.active || (aircraft.seats || 0) < passengers) {
      return NextResponse.json({ error: "Aircraft unavailable" }, { status: 409 });
    }

    let availabilityId: string | null = body.availabilityId || null;
    let price = (await calculateAircraftPrice(aircraft, origin, destination)).finalPrice;
    if (availabilityId) {
      const listing = await db.availability.findFirst({
        where: {
          id: availabilityId,
          aircraftId: aircraft.id,
          operatorId: aircraft.operatorId,
          status: { in: ["ACTIVE", "PUBLISHED"] },
          departureAt: { gte: new Date() },
          seats: { gte: passengers },
        },
      });
      if (!listing) return NextResponse.json({ error: "Availability unavailable" }, { status: 409 });
      availabilityId = listing.id;
      price = listing.price;
    }

    const booking = await db.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          userId: user.id,
          operatorId: aircraft.operatorId,
          aircraftId: aircraft.id,
          availabilityId,
          quoteId: body.quoteId || null,
          rfqId: body.rfqId || null,
          origin,
          destination,
          departureAt,
          passengers,
          price,
          status: "REQUESTED",
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: created.id,
          operatorId: aircraft.operatorId,
          toStatus: "REQUESTED",
          actorUserId: user.id,
          actorRole: user.role,
          note: "Customer requested booking",
        },
      });
      return created;
    });

    await notifyOperator(aircraft.operatorId, "New booking request", `${user.name} requested ${booking.origin} to ${booking.destination}.`, "BOOKING");
    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
