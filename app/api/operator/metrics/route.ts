import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireOperator, errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    const operatorId = user.operatorId!;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    const [
      totalAircraft,
      activeAircraft,
      pendingAircraft,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      totalAvailability,
      activeAvailability,
      totalRfqs,
      openRfqs,
      totalQuotes,
      activeQuotes,
      unreadNotifications,
    ] = await Promise.all([
      db.aircraft.count({ where: { operatorId } }),
      db.aircraft.count({ where: { operatorId, active: true } }),
      db.aircraft.count({ where: { operatorId, verified: false } }),
      db.booking.count({ where: { operatorId } }),
      db.booking.count({ where: { operatorId, status: "REQUESTED" } }),
      db.booking.count({ where: { operatorId, status: { in: ["OPERATOR_CONFIRMED", "PAID", "CONFIRMED"] } } }),
      db.availability.count({ where: { operatorId } }),
      db.availability.count({ where: { operatorId, status: { in: ["ACTIVE", "PUBLISHED"] } } }),
      db.rfq.count({ where: { quotes: { some: { operatorId } } } }),
      db.rfq.count({ where: { status: "OPEN", quotes: { some: { operatorId, status: "ACTIVE" } } } }),
      db.quote.count({ where: { operatorId } }),
      db.quote.count({ where: { operatorId, status: "ACTIVE", validUntil: { gte: now } } }),
      db.notification.count({ where: { operatorId, readAt: null } }),
    ]);

    return NextResponse.json({
      metrics: {
        fleet: { total: totalAircraft, active: activeAircraft, pending: pendingAircraft },
        bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings },
        availability: { total: totalAvailability, active: activeAvailability },
        rfqs: { total: totalRfqs, open: openRfqs },
        quotes: { total: totalQuotes, active: activeQuotes },
        notifications: { unread: unreadNotifications },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
