"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AircraftCard, RouteDisplay, SearchPanel, formatDateLabel } from "@/components/luxury";
import { findAirport } from "@/lib/airports";

function SearchContent() {
  const query = useSearchParams();
  const from = query.get("from") || "Delhi";
  const to = query.get("to") || "Dubai";
  const passengers = Number(query.get("pax") || 6);
  const date = query.get("date") || "";
  const emptyLegOnly = query.get("emptyLeg") === "1";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfq, setRfq] = useState(false);
  const [message, setMessage] = useState("");
  const label = formatDateLabel(date);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ from, to, pax: String(passengers) });
    if (date) params.set("date", date);
    if (emptyLegOnly) params.set("emptyLeg", "1");
    fetch(`/api/search?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (alive) setResults(json.results || []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [from, to, passengers, date, emptyLegOnly]);

  async function requestCharter() {
    setRfq(true);
    setMessage("");
    const response = await fetch("/api/rfq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: from,
        destination: to,
        departureAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        passengers,
      }),
    });
    const json = await response.json();
    setMessage(response.ok ? "Quote request sent." : json.error || "Sign in required.");
    setRfq(false);
  }

  return (
    <main>
      <section style={{ borderBottom: "var(--border)", padding: "var(--space-7) 0 var(--space-5)" }}>
        <div className="shell">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <span className="eyebrow">{emptyLegOnly ? "Empty legs" : "Available aircraft"}</span>
            <h1 style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>
              {emptyLegOnly ? "EMPTY LEGS" : `${findAirport(from).city.toUpperCase()} TO ${findAirport(to).city.toUpperCase()}`}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <RouteDisplay from={from} to={to} />
              <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)" }}>
                {label.day !== "Select" ? `${label.day} ${label.month}` : "Flexible date"} / {passengers} passengers
              </span>
            </div>
          </div>
          <div style={{ marginTop: "var(--space-6)" }}>
            <SearchPanel defaultFrom={from} defaultTo={to} defaultPassengers={passengers} defaultDate={date} compact />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <span>{loading ? "Searching" : emptyLegOnly ? `${results.length} empty legs` : `${results.length} aircraft`}</span>
            <h2>{loading ? "Finding aircraft for your trip." : emptyLegOnly ? "Confirmed empty legs" : "Available aircraft"}</h2>
          </div>

          {!loading && !results.length && (
            <div className="empty-state">
              <span className="eyebrow" style={{ color: "var(--accent)" }}>{emptyLegOnly ? "No empty legs" : "No match"}</span>
              <h3>{emptyLegOnly ? "No empty legs right now." : "We can source an aircraft for you."}</h3>
              <p>{emptyLegOnly ? "Try a full charter or request a quote." : "Send a quote request and we will source options for this route."}</p>
              <button className="btn btn-light" onClick={requestCharter} disabled={rfq}>{rfq ? "Sending..." : "Request charter"}</button>
            </div>
          )}

          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            {results.map((aircraft) => {
              const params = new URLSearchParams({ from, to, pax: String(passengers) });
              if (date) params.set("date", date);
              if (aircraft.availability?.id) params.set("availability", aircraft.availability.id);
              return (
                <AircraftCard
                  key={aircraft.id}
                  aircraft={aircraft}
                  from={from}
                  to={to}
                  href={`/aircraft/${aircraft.id}?${params.toString()}`}
                />
              );
            })}
          </div>

          {!!results.length && (
            <div className="empty-state" style={{ marginTop: "var(--space-6)" }}>
              <span className="eyebrow" style={{ color: "var(--accent)" }}>Quotation</span>
              <h3>Need something more specific?</h3>
              <p>Send one request and compare private quote options.</p>
              <button className="btn btn-light" onClick={requestCharter} disabled={rfq}>{rfq ? "Sending..." : "Request charter"}</button>
            </div>
          )}
          {message && <p style={{ color: "var(--accent-dark)", fontWeight: 600, marginTop: "var(--space-4)" }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<main><div className="shell section">Searching...</div></main>}>
      <SearchContent />
    </Suspense>
  );
}
