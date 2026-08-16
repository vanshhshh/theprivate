"use client";

import { useEffect, useState } from "react";
import { LuxuryButton, PriceDisplay, RouteDisplay } from "@/components/luxury";

type Pricing = Record<string, number | string>;

const labels: Array<[string, string]> = [
  ["defaultHourlyRate", "Base hourly cost"],
  ["defaultMinHours", "Minimum billable hours"],
  ["domesticHandling", "Domestic handling"],
  ["internationalHandling", "International handling"],
  ["crewDaily", "Crew daily"],
  ["fuelSurchargePercent", "Fuel surcharge percent"],
  ["operatorBuffer", "Operator buffer"],
  ["platformMarkupPercent", "Platform fee percent"],
  ["minQuote", "Minimum acceptable price"],
];

const fallbackPricing: Pricing = {
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

function previewPrice(pricing: Pricing) {
  const base = Math.max(Number(pricing.defaultHourlyRate || 0) * Math.max(Number(pricing.defaultMinHours || 2), 2), 1800000);
  const subtotal = base + Number(pricing.internationalHandling || 0) + Number(pricing.crewDaily || 0) + Number(pricing.operatorBuffer || 0);
  const fee = subtotal * (Number(pricing.platformMarkupPercent || 8) / 100);
  return Math.ceil(Math.max(subtotal + fee, Number(pricing.minQuote || 0)) / 1000) * 1000;
}

export default function OperatorPricing() {
  const [pricing, setPricing] = useState<Pricing>(fallbackPricing);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/operator/pricing")
      .then((res) => res.json())
      .then((json) => {
        if (json.pricing) setPricing(json.pricing);
        else if (json.error) setMessage(json.error);
      });
  }, []);

  async function save() {
    const response = await fetch("/api/operator/pricing", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pricing),
    });
    setMessage(response.ok ? "Pricing saved." : "Could not save pricing.");
  }

  return (
    <main>
      <section className="section">
        <div className="shell operatorGrid">
          <div>
            <div className="sectionHeading">
              <span>Pricing</span>
              <h1>Private economics. Customer simplicity.</h1>
              <p>Configure operator-side assumptions. Customers see only a single estimated price until confirmation.</p>
            </div>
            <div className="surface authFields">
              {labels.map(([key, label]) => (
                <label key={key}>{label.toUpperCase()}<input type="number" value={pricing[key] ?? ""} onChange={(event) => setPricing({ ...pricing, [key]: event.target.value })} /></label>
              ))}
              <LuxuryButton onClick={save}>SAVE PRICING</LuxuryButton>
              {message && <p className="notice">{message}</p>}
            </div>
          </div>
          <aside className="pricingPreview">
            <span className="microLabel">Customer price preview</span>
            <RouteDisplay from="Delhi" to="Dubai" />
            <PriceDisplay value={previewPrice(pricing)} />
            <p>Internal breakdown remains visible only to the operator.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
