"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, RouteDisplay } from "@/components/luxury";

type Pricing = {
  defaultHourlyRate: number | string;
  defaultMinHours: number | string;
  domesticHandling: number | string;
  internationalHandling: number | string;
  crewDaily: number | string;
  fuelSurchargePercent: number | string;
  operatorBuffer: number | string;
  platformMarkupPercent: number | string;
  minQuote: number | string;
};

const initialPricing: Pricing = {
  defaultHourlyRate: 0,
  defaultMinHours: 2,
  domesticHandling: 0,
  internationalHandling: 0,
  crewDaily: 0,
  fuelSurchargePercent: 0,
  operatorBuffer: 0,
  platformMarkupPercent: 8,
  minQuote: 0,
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [pricing, setPricing] = useState<Pricing>(initialPricing);
  const [message, setMessage] = useState("");

  async function load() {
    const [profileRes, metricsRes, pricingRes] = await Promise.all([
      fetch("/api/operator/profile"),
      fetch("/api/operator/metrics"),
      fetch("/api/operator/pricing"),
    ]);
    const profileJson = await profileRes.json();
    const metricsJson = await metricsRes.json();
    const pricingJson = await pricingRes.json();
    setData(profileJson);
    if (metricsJson.metrics) setMetrics(metricsJson.metrics);
    if (pricingJson.pricing) setPricing(pricingJson.pricing);
  }

  useEffect(() => {
    load();
  }, []);

  async function savePricing() {
    const response = await fetch("/api/operator/pricing", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pricing),
    });
    setMessage(response.ok ? "Pricing saved." : "Could not save pricing.");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!data || !metrics) return <main><div className="shell section">Loading...</div></main>;
  const operator = data.operator;
  if (!operator) {
    return (
      <main>
        <section className="section">
          <div className="shell">
            <div>
              <span className="eyebrow">Operator</span>
              <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Claimed operator account required.</h1>
              <p className="muted">Sign in with an approved operator account to manage fleet, pricing and requests.</p>
            </div>
            <div style={{ marginTop: "var(--space-5)" }}>
              <Button href="/operator/login">Operator access</Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const pendingAircraft = metrics.fleet.pending;
  const activeAircraft = metrics.fleet.active;

  return (
    <main>
      <section className="section-tight" style={{ borderBottom: "var(--border)" }}>
        <div className="shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Good morning, {operator.name}.</h1>
            <p className="muted">{operator.verified ? "Verified operator profile." : "Claim pending admin verification."}</p>
          </div>
          <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </section>

      <section className="section">
        <div className="shell" style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-7)" }}>
          <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
            <span className="eyebrow">Today</span>
            <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-2)" }}>{metrics.bookings.pending}</div>
            <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Booking requests</span>
          </div>
          <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
            <span className="eyebrow">Fleet</span>
            <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-2)" }}>{pendingAircraft}</div>
            <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Awaiting verification</span>
          </div>
          <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
            <span className="eyebrow">Aircraft</span>
            <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-2)" }}>{activeAircraft}</div>
            <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Active aircraft</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--space-7)", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, .85fr)" }}>
          <section>
            <span className="eyebrow">Fleet</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Aircraft readiness.</h3>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
              {operator.aircraft.slice(0, 12).map((aircraft: any) => (
                <FleetRow key={aircraft.id} aircraft={aircraft} onChanged={load} />
              ))}
            </div>
          </section>

          <section>
            <span className="eyebrow">Pricing</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Customer price preview.</h3>
            <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-5)", marginBottom: "var(--space-4)" }}>
              <PricingForm pricing={pricing} setPricing={setPricing} />
            </div>
            <div style={{ background: "var(--ink)", color: "var(--white)", padding: "var(--space-5)", display: "grid", gap: "var(--space-3)" }}>
              <RouteDisplay from="Delhi" to="Dubai" />
              <div style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>Rs {previewPrice(pricing)}</div>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "var(--text-sm)" }}>Internal settings stay operator-only. Customers see a single estimated price.</p>
            </div>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Button onClick={savePricing}>Save pricing</Button>
            </div>
            {message && <p style={{ color: "var(--accent-dark)", fontWeight: 700, marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>{message}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}

function previewPrice(pricing: Pricing) {
  const hourly = Number(pricing.defaultHourlyRate || 0);
  const minHours = Math.max(2, Number(pricing.defaultMinHours || 2));
  const base = hourly > 0 ? hourly * minHours : 1800000;
  const handling = Number(pricing.internationalHandling || 0);
  const crew = Number(pricing.crewDaily || 0);
  const buffer = Number(pricing.operatorBuffer || 0);
  const subtotal = base + handling + crew + buffer;
  const markup = subtotal * (Number(pricing.platformMarkupPercent || 8) / 100);
  return Math.ceil(Math.max(subtotal + markup, Number(pricing.minQuote || 0)) / 1000) * 1000;
}

function PricingForm({ pricing, setPricing }: { pricing: Pricing; setPricing: (p: Pricing) => void }) {
  const fields: Array<[keyof Pricing, string]> = [
    ["defaultHourlyRate", "Base hourly cost"],
    ["defaultMinHours", "Minimum billable hours"],
    ["domesticHandling", "Domestic handling"],
    ["internationalHandling", "International handling"],
    ["crewDaily", "Crew daily"],
    ["operatorBuffer", "Operator buffer"],
    ["platformMarkupPercent", "Platform fee percent"],
    ["minQuote", "Minimum acceptable price"],
  ];
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {fields.map(([key, label]) => (
        <label key={key} style={{ display: "grid", gap: "var(--space-1)" }}>
          <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>{label}</span>
          <input
            className="input"
            type="number"
            value={pricing[key]}
            onChange={(e) => setPricing({ ...pricing, [key]: e.target.value })}
            style={{ maxWidth: 240 }}
          />
        </label>
      ))}
    </div>
  );
}

function FleetRow({ aircraft, onChanged }: { aircraft: any; onChanged: () => void }) {
  async function update(next: Partial<{ verified: boolean; active: boolean }>) {
    await fetch("/api/operator/aircraft", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: aircraft.id, verified: aircraft.verified, active: aircraft.active, ...next }),
    });
    onChanged();
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
      <div>
        <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{aircraft.model || aircraft.type || "Aircraft"}</b>
        <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{aircraft.registration} / {aircraft.seats || "-"} seats</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button className="btn btn-sm" onClick={() => update({ verified: !aircraft.verified })}>{aircraft.verified ? "Verified" : "Confirm"}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => update({ active: !aircraft.active })}>{aircraft.active ? "Active" : "Inactive"}</button>
      </div>
    </div>
  );
}
