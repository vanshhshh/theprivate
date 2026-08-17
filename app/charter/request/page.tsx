"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AirportCombobox, Button, DatePicker, PassengerSelector } from "@/components/luxury";

function CharterRequestContent() {
  const query = useSearchParams();
  const [origin, setOrigin] = useState(query.get("from") || "Delhi");
  const [destination, setDestination] = useState(query.get("to") || "Dubai");
  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [passengers, setPassengers] = useState(Number(query.get("pax") || 6));
  const [preference, setPreference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    setMessage("");
    const response = await fetch("/api/rfq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        departureAt: departureAt ? new Date(departureAt).toISOString() : new Date().toISOString(),
        passengers,
        notes: [preference, notes, returnAt ? `Return: ${returnAt}` : ""].filter(Boolean).join("\n"),
      }),
    });
    const json = await response.json();
    setMessage(response.ok ? "Quote request sent." : json.error || "Could not send request.");
    setSending(false);
  }

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Private charter</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>We can source an aircraft for you.</h1>
            <p className="muted">Tell us the trip. We will source options.</p>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)" }}>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">01 / Where</span>
              <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>Where are you going?</h3>
              <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <AirportCombobox label="From" value={origin} onChange={setOrigin} />
                <AirportCombobox label="To" value={destination} onChange={setDestination} />
              </div>
            </div>

            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">02 / When</span>
              <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>When?</h3>
              <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <DatePicker label="Departure" value={departureAt} onChange={setDepartureAt} />
                <DatePicker label="Return" value={returnAt} onChange={setReturnAt} />
              </div>
            </div>

            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">03 / Who</span>
              <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>Who is flying?</h3>
              <PassengerSelector value={passengers} onChange={setPassengers} />
            </div>

            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">04 / Preferences</span>
              <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>What do you need?</h3>
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                <input
                  className="input"
                  placeholder="Aircraft preference"
                  value={preference}
                  onChange={(e) => setPreference(e.target.value)}
                />
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <Button onClick={submit} disabled={sending}>{sending ? "Requesting..." : "Request charter"}</Button>
            {message && <span style={{ color: "var(--accent-dark)", fontWeight: 600, fontSize: "var(--text-sm)" }}>{message}</span>}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CharterRequest() {
  return (
    <Suspense fallback={<main><div className="shell section">Loading...</div></main>}>
      <CharterRequestContent />
    </Suspense>
  );
}
