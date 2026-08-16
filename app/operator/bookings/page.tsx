"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuxuryButton, PriceDisplay, RouteDisplay } from "@/components/luxury";

export default function OperatorBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/bookings");
    const json = await response.json();
    if (json.bookings) setBookings(json.bookings);
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
        <div className="shell">
          <div className="sectionHeading">
            <span>Bookings</span>
            <h1>Requests awaiting a decision.</h1>
          </div>
          {message && <p className="notice">{message}</p>}
          <div className="resultList">
            {bookings.map((booking) => (
              <article className="surface" key={booking.id}>
                <RouteDisplay from={booking.origin} to={booking.destination} />
                <h2>{booking.aircraft?.model || "Private aircraft"}</h2>
                <p className="muted">{booking.passengers} passengers / {booking.status.replaceAll("_", " ")}</p>
                <PriceDisplay value={booking.price} />
                <div className="actions">
                  {booking.status === "REQUESTED" && <LuxuryButton onClick={() => transition(booking.id, "OPERATOR_CONFIRMED")}>CONFIRM</LuxuryButton>}
                  {booking.status === "REQUESTED" && <LuxuryButton variant="ghost" onClick={() => transition(booking.id, "REJECTED")}>REJECT</LuxuryButton>}
                  <LuxuryButton href={`/booking/${booking.id}`} variant="light">OPEN</LuxuryButton>
                </div>
              </article>
            ))}
            {!bookings.length && (
              <div className="emptyState">
                <h2>No booking requests.</h2>
                <p>New customer requests will appear here.</p>
                <Link className="luxuryButton light" href="/operator/dashboard">DASHBOARD</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
