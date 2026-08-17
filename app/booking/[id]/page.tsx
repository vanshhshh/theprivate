"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, PriceDisplay, RouteDisplay } from "@/components/luxury";

function bookingLabel(status: string) {
  if (status === "OPERATOR_CONFIRMED") return "CONFIRMED";
  return status.replaceAll("_", " ");
}

export default function Booking() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/bookings/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        if (json.booking) setBooking(json.booking);
        else setMessage(json.error || "Booking unavailable.");
      });
    return () => {
      alive = false;
    };
  }, [params.id]);

  async function pay() {
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookingId: params.id }),
    });
    const json = await response.json();
    if (json.url) window.location.href = json.url;
    else setMessage(json.error || "Payment unavailable.");
  }

  if (!booking) {
    return <main><div className="shell section">{message || "Loading..."}</div></main>;
  }

  return (
    <main>
      <section className="section">
        <div className="shell operatorGrid">
          <div>
            <div className="eyebrow">Booking</div>
            <h1>{booking.origin} to {booking.destination}</h1>
            <p className="muted">{booking.aircraft?.model || "Aircraft"} / {booking.passengers} passengers</p>
          </div>
          <aside className="pricingPreview">
            <RouteDisplay from={booking.origin} to={booking.destination} />
            <PriceDisplay value={booking.price} label={booking.status === "CONFIRMED" ? "CONFIRMED PRICE" : "ESTIMATED PRICE"} />
            <p>Status: {bookingLabel(booking.status)}</p>
            {booking.status === "OPERATOR_CONFIRMED" && <Button variant="light" onClick={pay}>PAY SECURELY</Button>}
            {booking.status === "REQUESTED" && <p>Waiting for confirmation.</p>}
            {booking.status === "PAID" && <p>Payment received. Awaiting final confirmation.</p>}
            {message && <p className="error">{message}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}
