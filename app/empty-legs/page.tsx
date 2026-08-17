"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AircraftCard, RouteDisplay, SearchPanel, formatDateLabel } from "@/components/luxury";

function EmptyLegsContent() {
  const query = useSearchParams();
  const from = query.get("from") || "";
  const to = query.get("to") || "";
  const passengers = Number(query.get("pax") || 6);
  const date = query.get("date") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ emptyLeg: "1", pax: String(passengers) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
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
  }, [from, to, passengers, date]);

  return (
    <main>
      <section style={{ borderBottom: "var(--border)", padding: "var(--space-7) 0 var(--space-5)" }}>
        <div className="shell">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <span className="eyebrow">Empty legs</span>
            <h1 style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>Fly a route already in motion.</h1>
            <p className="muted" style={{ maxWidth: 480 }}>Confirmed empty-leg opportunities when they are available. Search by route or browse all current opportunities.</p>
          </div>
          <div style={{ marginTop: "var(--space-6)" }}>
            <SearchPanel defaultFrom={from || "Delhi"} defaultTo={to || "Dubai"} defaultPassengers={passengers} defaultDate={date} compact />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <span>{loading ? "Searching" : `${results.length} empty legs`}</span>
            <h2>{loading ? "Finding empty legs." : "Confirmed empty legs"}</h2>
          </div>
          {!loading && !results.length && (
            <div className="empty-state">
              <span className="eyebrow" style={{ color: "var(--accent)" }}>No empty legs</span>
              <h3>No empty legs right now.</h3>
              <p>Try a full charter or request a quote.</p>
            </div>
          )}
          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            {results.map((aircraft) => {
              const params = new URLSearchParams({ from, to, pax: String(passengers) });
              if (date) params.set("date", date);
              if (aircraft.availability?.id) params.set("availability", aircraft.availability.id);
              return (
                <AircraftCard key={aircraft.id} aircraft={aircraft} from={from || "Delhi"} to={to || "Dubai"} href={`/aircraft/${aircraft.id}?${params.toString()}`} />
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function EmptyLegs() {
  return (
    <Suspense fallback={<main><div className="shell section">Loading...</div></main>}>
      <EmptyLegsContent />
    </Suspense>
  );
}
