import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/prisma";
import { errorResponse, readJson, requireUser } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Payments are not configured. Add STRIPE_SECRET_KEY." }, { status: 503 });
    }
    const appUrl = process.env.APP_URL;
    if (!appUrl) return NextResponse.json({ error: "APP_URL is required for checkout" }, { status: 500 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { bookingId } = await readJson(req);
    const booking = await db.booking.findFirst({ where: { id: String(bookingId), userId: user.id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "OPERATOR_CONFIRMED" && booking.status !== "PAYMENT_PENDING") {
      return NextResponse.json({ error: "Booking is not ready for payment" }, { status: 409 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `Private charter ${booking.origin} to ${booking.destination}` },
            unit_amount: booking.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/booking/${booking.id}`,
      cancel_url: `${appUrl}/booking/${booking.id}`,
      metadata: { bookingId: booking.id },
    });

    await db.$transaction([
      db.booking.update({ where: { id: booking.id }, data: { status: "PAYMENT_PENDING", paymentRef: session.id } }),
      db.bookingEvent.create({
        data: {
          bookingId: booking.id,
          operatorId: booking.operatorId,
          fromStatus: booking.status,
          toStatus: "PAYMENT_PENDING",
          actorUserId: user.id,
          actorRole: user.role,
          note: "Stripe Checkout session created",
        },
      }),
    ]);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
