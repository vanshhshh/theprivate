"use client";

import { useEffect, useState } from "react";
import { LuxuryButton } from "@/components/luxury";
import Link from "next/link";

export default function Admin() {
  const [operators, setOperators] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/operators");
    const json = await response.json();
    if (response.ok) setOperators(json.operators || []);
    else setMessage(json.error || "Admin access required.");
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const response = await fetch("/api/admin/operators", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatorId: id, approveClaim: true }),
    });
    setMessage(response.ok ? "Claim approved." : "Could not approve claim.");
    load();
  }

  async function invite(id: string) {
    const response = await fetch("/api/operator/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatorId: id }),
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error || "Could not create invite.");
      return;
    }
    await navigator.clipboard?.writeText(json.url);
    setMessage(`Claim link copied: ${json.url}`);
  }

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="sectionHeading">
            <span>Admin</span>
            <h1>Marketplace control.</h1>
            <p>Review operators, pending claims and fleet readiness.</p>
          </div>
          {message && <p className="notice">{message}</p>}
          <div className="adminRows">
            {operators.map((operator) => (
              <div className="adminRow" key={operator.id}>
                <span>
                  <b>{operator.name}</b>
                  <small className="muted">{operator.aircraft.length} aircraft / {operator.priority || "unprioritized"} / {operator.claimed ? "claimed" : "unclaimed"}</small>
                </span>
                <span className="pill">{operator.verified ? "Verified" : "Unverified"}</span>
                <Link className="luxuryButton ghost" href={`/operator/${operator.id}`}>PROFILE</Link>
                <LuxuryButton variant="light" onClick={() => invite(operator.id)}>COPY CLAIM LINK</LuxuryButton>
                {operator.claims?.some((claim: any) => claim.userId) && <LuxuryButton variant="light" onClick={() => approve(operator.id)}>APPROVE</LuxuryButton>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
