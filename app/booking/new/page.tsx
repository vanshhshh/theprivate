"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AirportDisplay, LuxuryButton, RouteDisplay } from "@/components/luxury";

function NewBookingContent() {
  const query = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const from = query.get("from") || "Delhi";
  const to = query.get("to") || "Dubai";
  const passengers = Number(query.get("pax") || 1);

  async function create() {
    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aircraftId: query.get("aircraft"),
        availabilityId: query.get("availability"),
        origin: from,
        destination: to,
        departureAt: query.get("date") ? new Date(query.get("date")!).toISOString() : new Date().toISOString(),
        passengers,
      }),
    });
    const json = await response.json();
    if (json.booking) router.push(`/booking/${json.booking.id}`);
    else setMessage(json.error || "Sign in required.");
    setSubmitting(false);
  }

  return (
    <main>
      <section className="section">
        <div className="shell operatorGrid">
          <div>
            <div className="eyebrow">Booking request</div>
            <h1>Request confirmation.</h1>
            <p className="muted">No payment is requested until availability and price are confirmed.</p>
          </div>
          <aside className="surface">
            <RouteDisplay from={from} to={to} />
            <div className="detailStats" style={{ marginTop: 24 }}>
              <div><span>From</span><AirportDisplay value={from} /></div>
              <div><span>To</span><AirportDisplay value={to} /></div>
              <div><span>Passengers</span><b>{passengers}</b></div>
              <div><span>Price</span><b>Server calculated</b></div>
            </div>
            <div style={{ marginTop: 24 }}>
              <LuxuryButton onClick={create} disabled={submitting}>{submitting ? "REQUESTING" : "REQUEST CONFIRMATION"}</LuxuryButton>
            </div>
            {message && <p className="error">{message}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function NewBooking() {
  return (
    <Suspense fallback={<main><div className="shell section">Loading...</div></main>}>
      <NewBookingContent />
    </Suspense>
  );
}
