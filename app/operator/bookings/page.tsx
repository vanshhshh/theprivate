"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, PriceDisplay, RouteDisplay } from "@/components/luxury";

export default function OperatorBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/bookings");
    const json = await response.json();
    if (json.bookings) setBookings(json.bookings.filter((b: any) => b.status === "REQUESTED"));
    else setMessage(json.error || "Operator access required.");
  }

  useEffect(() => {
    load();
  }, []);

  async function transition(id: string, status: string) {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const json = await response.json();
      setMessage(json.error || "Could not update booking.");
      return;
    }
    load();
  }

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Bookings</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Requests awaiting a decision.</h1>
          </div>
          {message && <p style={{ color: "var(--accent-dark)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{message}</p>}
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {bookings.map((booking) => (
              <div key={booking.id} style={{ padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                  <RouteDisplay from={booking.origin} to={booking.destination} />
                  <span className="badge badge-muted">{booking.status.replaceAll("_", " ")}</span>
                </div>
                <b style={{ fontSize: "var(--text-base)", fontFamily: "var(--serif)", fontWeight: 500, display: "block", marginBottom: "var(--space-1)" }}>{booking.aircraft?.model || "Private aircraft"}</b>
                <p className="muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>{booking.passengers} passengers</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
                  <PriceDisplay value={booking.price} />
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {booking.status === "REQUESTED" && (
                      <>
                        <button className="btn btn-sm btn-dark" onClick={() => transition(booking.id, "OPERATOR_CONFIRMED")}>Confirm</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => transition(booking.id, "REJECTED")}>Reject</button>
                      </>
                    )}
                    <Link className="btn btn-sm btn-light" href={`/booking/${booking.id}`}>Open</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!bookings.length && (
            <div className="empty-state">
              <h3>No booking requests.</h3>
              <p>New customer requests will appear here.</p>
              <Link className="btn btn-light" href="/operator/dashboard">Dashboard</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
