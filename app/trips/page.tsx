"use client";

import { useEffect, useState } from "react";
import { LuxuryButton, PriceDisplay, RouteDisplay } from "@/components/luxury";

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
        <div className="shell">
          <div className="sectionHeading">
            <span>My trips</span>
            <h1>Your private flights.</h1>
          </div>
          {message && <div className="emptyState"><h2>{message}</h2><LuxuryButton href="/login" variant="light">SIGN IN</LuxuryButton></div>}
          <div className="resultList">
            {bookings.map((booking) => (
              <article className="surface" key={booking.id}>
                <RouteDisplay from={booking.origin} to={booking.destination} />
                <h2>{booking.aircraft?.model || "Private aircraft"}</h2>
                <p className="muted">{booking.status.replaceAll("_", " ")}</p>
                <PriceDisplay value={booking.price} />
                <div style={{ marginTop: 18 }}><LuxuryButton href={`/trips/${booking.id}`} variant="light">OPEN TRIP</LuxuryButton></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
