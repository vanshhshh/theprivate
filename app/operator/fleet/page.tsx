"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/luxury";

export default function OperatorFleet() {
  const [operator, setOperator] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const json = await fetch("/api/operator/profile").then((res) => res.json());
    if (json.operator) setOperator(json.operator);
    else setMessage("Operator access required.");
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(aircraft: any, next: Partial<{ verified: boolean; active: boolean }>) {
    await fetch("/api/operator/aircraft", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: aircraft.id, verified: aircraft.verified, active: aircraft.active, ...next }),
    });
    load();
  }

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Fleet</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Aircraft readiness.</h1>
          </div>
          {message && <p style={{ color: "var(--accent-dark)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{message}</p>}
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {operator?.aircraft?.map((aircraft: any) => (
              <div key={aircraft.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                <div>
                  <b style={{ fontSize: "var(--text-lg)", fontFamily: "var(--serif)", fontWeight: 500 }}>{aircraft.model || aircraft.type || "Aircraft"}</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{aircraft.registration} / {aircraft.seats || "-"} seats</span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-sm" onClick={() => toggle(aircraft, { verified: !aircraft.verified })}>{aircraft.verified ? "Verified" : "Confirm"}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggle(aircraft, { active: !aircraft.active })}>{aircraft.active ? "Active" : "Inactive"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
