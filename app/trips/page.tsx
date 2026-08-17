"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, PriceDisplay, RouteDisplay } from "@/components/luxury";

export default function Trips() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((json) => {
        if (json.bookings) setBookings(json.bookings);
        else setMessage(json.error || "Sign in to view trips.");
      });
  }, []);

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">My trips</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Your private flights.</h1>
          </div>
          {message && (
            <div className="empty-state">
              <h3>{message}</h3>
              <Link className="btn btn-light" href="/login">Sign in</Link>
            </div>
          )}
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {bookings.map((booking) => (
              <div key={booking.id} style={{ padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                  <RouteDisplay from={booking.origin} to={booking.destination} />
                  <span className="badge badge-muted">{booking.status.replaceAll("_", " ")}</span>
                </div>
                <b style={{ fontSize: "var(--text-base)", fontFamily: "var(--serif)", fontWeight: 500, display: "block", marginBottom: "var(--space-1)" }}>{booking.aircraft?.model || "Private aircraft"}</b>
                <p className="muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>{booking.departureAt.toLocaleString("en-US")} / {booking.passengers} passengers</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
                  <PriceDisplay value={booking.price} label={booking.status === "CONFIRMED" ? "Confirmed price" : "Estimated price"} />
                  <Link className="btn btn-sm btn-light" href={`/trips/${booking.id}`}>Open trip</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
