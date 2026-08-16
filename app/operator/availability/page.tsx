"use client";

import { useEffect, useState } from "react";
import { LuxuryButton } from "@/components/luxury";

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
        <div className="shell operatorGrid">
          <div className="surface authFields">
            <span className="microLabel">Availability</span>
            <h1>Publish aircraft.</h1>
            <label>AIRCRAFT<select value={form.aircraftId} onChange={(event) => setForm({ ...form, aircraftId: event.target.value })}>{aircraft.map((item) => <option key={item.id} value={item.id}>{item.model || item.type} / {item.registration}</option>)}</select></label>
            <label>ORIGIN<input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></label>
            <label>DESTINATION<input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} /></label>
            <label>DEPARTURE<input type="datetime-local" value={form.departureAt} onChange={(event) => setForm({ ...form, departureAt: event.target.value })} /></label>
            <label>SEATS<input type="number" value={form.seats} onChange={(event) => setForm({ ...form, seats: event.target.value })} /></label>
            <label>MINIMUM PRICE<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
            <label><span><input type="checkbox" checked={form.emptyLeg} onChange={(event) => setForm({ ...form, emptyLeg: event.target.checked })} /> Empty leg</span></label>
            <LuxuryButton onClick={publish}>PUBLISH</LuxuryButton>
            {message && <p className="notice">{message}</p>}
          </div>
          <aside className="surface">
            <span className="microLabel">Live listings</span>
            <div className="fleetRows">
              {availability.map((item) => (
                <div className="fleetRow" key={item.id}>
                  <span><b>{item.origin} to {item.destination}</b><small className="muted">{item.aircraft?.registration} / {item.status} / {item.emptyLeg ? "empty leg" : "charter"}</small></span>
                  <strong>Rs {(item.price / 100000).toFixed(1)}L</strong>
                </div>
              ))}
              {!availability.length && <p className="muted">No published availability.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
