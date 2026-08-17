import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [expiredBookings, expiredQuotes, expiredClaims] = await Promise.all([
    db.booking.updateMany({
      where: {
        status: { in: ["REQUESTED", "OPERATOR_REVIEW"] },
        createdAt: { lt: thirtyDaysAgo },
      },
      data: { status: "EXPIRED" },
    }),
    db.quote.updateMany({
      where: {
        status: "ACTIVE",
        validUntil: { lt: now },
      },
      data: { status: "EXPIRED" },
    }),
    db.claim.deleteMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    }),
  ]);

  return NextResponse.json({
    generatedAt: now,
    expiredBookings: expiredBookings.count,
    expiredQuotes: expiredQuotes.count,
    deletedClaims: expiredClaims.count,
  });
}
