"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/luxury";

export default function OperatorAvailability() {
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [form, setForm] = useState({ aircraftId: "", origin: "Delhi", destination: "Mumbai", departureAt: "", price: "", seats: "", emptyLeg: false });
  const [message, setMessage] = useState("");

  async function load() {
    const profile = await fetch("/api/operator/profile").then((res) => res.json());
    if (profile.operator) {
      setAircraft(profile.operator.aircraft || []);
      setForm((current) => ({ ...current, aircraftId: current.aircraftId || profile.operator.aircraft?.[0]?.id || "" }));
    }
    const listings = await fetch("/api/operator/availability").then((res) => res.json());
    if (listings.availability) setAvailability(listings.availability);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish() {
    const response = await fetch("/api/operator/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), seats: form.seats ? Number(form.seats) : undefined }),
    });
    setMessage(response.ok ? "Availability published." : "Could not publish availability.");
    load();
  }

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Availability</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Publish aircraft.</h1>
            <p className="muted">List available aircraft for charter or empty legs.</p>
          </div>

          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              <label style={{ display: "grid", gap: "var(--space-1)" }}>
                <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Aircraft</span>
                <select className="input" value={form.aircraftId} onChange={(e) => setForm({ ...form, aircraftId: e.target.value })}>
                  {aircraft.map((item) => <option key={item.id} value={item.id}>{item.model || item.type} / {item.registration}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Origin</span>
                  <input className="input" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
                </label>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Destination</span>
                  <input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                </label>
              </div>
              <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Departure</span>
                  <input className="input" type="datetime-local" value={form.departureAt} onChange={(e) => setForm({ ...form, departureAt: e.target.value })} />
                </label>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Seats</span>
                  <input className="input" type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
                </label>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Minimum price (INR)</span>
                  <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={form.emptyLeg} onChange={(e) => setForm({ ...form, emptyLeg: e.target.checked })} />
                <span style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase", fontWeight: 600 }}>Empty leg</span>
              </label>
              <Button onClick={publish}>Publish</Button>
            </div>
            {message && <p style={{ color: "var(--accent-dark)", fontWeight: 700, marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>{message}</p>}
          </div>

          <div>
            <span className="eyebrow">Live listings</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Published availability.</h3>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
              {availability.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                  <div>
                    <b style={{ fontSize: "var(--text-sm)" }}>{item.origin} to {item.destination}</b>
                    <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{item.aircraft?.registration} / {item.status} / {item.emptyLeg ? "empty leg" : "charter"}</span>
                  </div>
                  <strong style={{ fontFamily: "var(--serif)", fontSize: "var(--text-xl)" }}>Rs {(item.price / 100000).toFixed(1)}L</strong>
                </div>
              ))}
              {!availability.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No published availability.</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
