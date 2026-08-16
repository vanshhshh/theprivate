import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const booking = await db.booking.findUnique({ where: { id: bookingId } });
      if (booking && booking.status === "PAYMENT_PENDING") {
        await db.$transaction([
          db.booking.update({ where: { id: booking.id }, data: { status: "PAID", paymentRef: session.id } }),
          db.bookingEvent.create({
            data: {
              bookingId: booking.id,
              operatorId: booking.operatorId,
              fromStatus: booking.status,
              toStatus: "PAID",
              note: "Stripe checkout.session.completed",
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
