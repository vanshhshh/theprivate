"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          <div className="sectionHeading"><span>Fleet</span><h1>Aircraft readiness.</h1></div>
          {message && <p className="notice">{message}</p>}
          <div className="fleetRows">
            {operator?.aircraft?.map((aircraft: any) => (
              <div className="fleetRow" key={aircraft.id}>
                <span><Link href={`/operator/fleet/${aircraft.id}`}><b>{aircraft.model || aircraft.type || "Aircraft"}</b></Link><small className="muted">{aircraft.registration} / {aircraft.seats || "-"} seats</small></span>
                <button className="pill" onClick={() => toggle(aircraft, { verified: !aircraft.verified })}>{aircraft.verified ? "Verified" : "Confirm"}</button>
                <button className="pill" onClick={() => toggle(aircraft, { active: !aircraft.active })}>{aircraft.active ? "Active" : "Inactive"}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
