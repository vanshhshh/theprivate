import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, readJson, requireUser } from "@/lib/api";
import { notifyOperator, notifyUser } from "@/lib/notifications";
import { BookingStatus } from "@/app/generated/prisma/enums";

const transitions: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ["OPERATOR_REVIEW", "OPERATOR_CONFIRMED", "REJECTED", "CANCELLED"],
  QUOTED: ["REQUESTED", "EXPIRED", "CANCELLED"],
  OPERATOR_REVIEW: ["OPERATOR_CONFIRMED", "REJECTED", "CANCELLED"],
  OPERATOR_CONFIRMED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["CONFIRMED"],
  CONFIRMED: ["CANCELLED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && value in transitions;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const booking = await db.booking.findUnique({
      where: { id },
      include: { aircraft: true, operator: true, availability: true, quote: true, user: true, events: { orderBy: { createdAt: "asc" } } },
    });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (booking.userId !== user.id && booking.operatorId !== user.operatorId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await readJson(req);
    const next = body.status;
    if (!isBookingStatus(next)) return NextResponse.json({ error: "Invalid booking status" }, { status: 400 });

    const booking = await db.booking.findUnique({ where: { id }, include: { operator: true, user: true } });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!transitions[booking.status].includes(next)) {
      return NextResponse.json({ error: `Invalid transition ${booking.status} to ${next}` }, { status: 409 });
    }

    const operatorOnly: BookingStatus[] = ["OPERATOR_REVIEW", "OPERATOR_CONFIRMED", "REJECTED"];
    const customerOnly: BookingStatus[] = ["PAYMENT_PENDING", "CANCELLED"];
    if (operatorOnly.includes(next) && user.operatorId !== booking.operatorId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (customerOnly.includes(next) && user.id !== booking.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (next === "PAID" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Payment status is webhook controlled" }, { status: 403 });
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.booking.update({ where: { id }, data: { status: next } });
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          operatorId: booking.operatorId,
          fromStatus: booking.status,
          toStatus: next,
          actorUserId: user.id,
          actorRole: user.role,
          note: body.note ? String(body.note).slice(0, 500) : null,
        },
      });
      return result;
    });

    const label = next.replaceAll("_", " ").toLowerCase();
    await notifyUser(booking.userId, "Booking updated", `Booking ${booking.origin} to ${booking.destination} is ${label}.`, "BOOKING");
    await notifyOperator(booking.operatorId, "Booking updated", `Booking ${booking.origin} to ${booking.destination} is ${label}.`, "BOOKING");
    return NextResponse.json({ booking: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
