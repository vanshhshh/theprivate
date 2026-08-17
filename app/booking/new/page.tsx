"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AirportDisplay, Button, RouteDisplay } from "@/components/luxury";

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
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Booking request</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Request confirmation.</h1>
            <p className="muted">No payment is requested until availability and price are confirmed.</p>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-6)" }}>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Route</span>
              <div style={{ marginTop: "var(--space-3)" }}>
                <RouteDisplay from={from} to={to} />
              </div>
            </div>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">From</span>
              <div style={{ marginTop: "var(--space-2)" }}>
                <AirportDisplay value={from} />
              </div>
            </div>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">To</span>
              <div style={{ marginTop: "var(--space-2)" }}>
                <AirportDisplay value={to} />
              </div>
            </div>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Passengers</span>
              <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-3xl)", fontFamily: "var(--serif)" }}>{passengers}</div>
            </div>
            <div style={{ padding: "var(--space-5)", background: "var(--ink)", color: "var(--white)" }}>
              <span className="eyebrow" style={{ color: "var(--accent)" }}>Price</span>
              <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-3xl)", fontFamily: "var(--serif)" }}>Server calculated</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button onClick={create} disabled={submitting}>{submitting ? "Requesting..." : "Request confirmation"}</Button>
          </div>
          {message && <p style={{ color: "var(--error)", fontWeight: 600, marginTop: "var(--space-4)" }}>{message}</p>}
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
