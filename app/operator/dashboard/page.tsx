"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuxuryButton, PriceDisplay, RouteDisplay } from "@/components/luxury";

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
            <div className="sectionHeading">
              <span>Operator access</span>
              <h1>Claimed operator account required.</h1>
              <p>Sign in with an approved operator account to manage fleet, pricing and requests.</p>
            </div>
            <LuxuryButton href="/operator/login">OPERATOR ACCESS</LuxuryButton>
          </div>
        </section>
      </main>
    );
  }

  const pendingAircraft = metrics.fleet.pending;
  const activeAircraft = metrics.fleet.active;

  return (
    <main>
      <section className="section">
        <div className="shell operatorShell">
          <div className="operatorHero">
            <div>
              <div className="eyebrow">Operator</div>
              <h1>Good morning, {operator.name}.</h1>
              <p className="muted">{operator.verified ? "Verified operator profile." : "Claim pending admin verification."}</p>
            </div>
            <button className="luxuryButton ghost" onClick={signOut}>SIGN OUT</button>
          </div>

          <div className="actionStrip">
            <div>
              <span className="microLabel">TODAY</span>
              <h3>Booking requests</h3>
              <b>{metrics.bookings.pending}</b>
            </div>
            <div>
              <span className="microLabel">FLEET</span>
              <h3>Awaiting verification</h3>
              <b>{pendingAircraft}</b>
            </div>
            <div>
              <span className="microLabel">AIRCRAFT</span>
              <h3>Active aircraft</h3>
              <b>{activeAircraft}</b>
            </div>
          </div>

          <div className="operatorGrid">
            <section className="surface">
              <span className="microLabel">Fleet</span>
              <h2>Aircraft readiness.</h2>
              <div className="fleetRows">
                {operator.aircraft.slice(0, 12).map((aircraft: any) => (
                  <FleetRow key={aircraft.id} aircraft={aircraft} onChanged={load} />
                ))}
              </div>
            </section>

            <section className="surface">
              <span className="microLabel">Pricing</span>
              <h2>Customer price preview.</h2>
              <PricingForm pricing={pricing} setPricing={setPricing} />
              <div className="pricingPreview" style={{ marginTop: 18 }}>
                <RouteDisplay from="Delhi" to="Dubai" />
                <PriceDisplay value={previewPrice(pricing)} />
                <p>Internal settings stay operator-only. Customers see a single estimated price.</p>
              </div>
              <div style={{ marginTop: 16 }}>
                <LuxuryButton onClick={savePricing}>SAVE PRICING</LuxuryButton>
              </div>
              {message && <p className="notice">{message}</p>}
            </section>
          </div>

          <div className="operatorGrid">
            <section className="surface">
              <span className="microLabel">Availability</span>
              <h2>Publish aircraft.</h2>
              <Availability aircraft={operator.aircraft} />
            </section>
            <section className="surface">
              <span className="microLabel">Bookings</span>
              <h2>Requests.</h2>
              <Bookings />
            </section>
          </div>

          <section className="surface">
            <span className="microLabel">Notifications</span>
            <Notifications />
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

function PricingForm({ pricing, setPricing }: { pricing: Pricing; setPricing: (pricing: Pricing) => void }) {
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
    <div className="authFields">
      {fields.map(([key, label]) => (
        <label key={key}>{label.toUpperCase()}<input className="operatorInput" type="number" value={pricing[key]} onChange={(event) => setPricing({ ...pricing, [key]: event.target.value })} /></label>
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
    <div className="fleetRow">
      <span><b>{aircraft.model || aircraft.type || "Aircraft"}</b><small className="muted">{aircraft.registration} / {aircraft.seats || "-"} seats</small></span>
      <button className="pill" onClick={() => update({ verified: !aircraft.verified })}>{aircraft.verified ? "Verified" : "Confirm"}</button>
      <button className="pill" onClick={() => update({ active: !aircraft.active })}>{aircraft.active ? "Active" : "Inactive"}</button>
    </div>
  );
}

function Availability({ aircraft }: { aircraft: any[] }) {
  const [form, setForm] = useState({ aircraftId: aircraft[0]?.id || "", origin: "Delhi", destination: "Mumbai", departureAt: "", price: "", emptyLeg: false });
  const [message, setMessage] = useState("");

  async function submit() {
    const response = await fetch("/api/operator/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    setMessage(response.ok ? "Availability published." : "Could not publish.");
  }

  return (
    <div className="authFields">
      <label>AIRCRAFT<select value={form.aircraftId} onChange={(event) => setForm({ ...form, aircraftId: event.target.value })}>{aircraft.map((item) => <option key={item.id} value={item.id}>{item.model || item.type} / {item.registration}</option>)}</select></label>
      <label>ORIGIN<input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></label>
      <label>DESTINATION<input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} /></label>
      <label>DEPARTURE<input type="datetime-local" value={form.departureAt} onChange={(event) => setForm({ ...form, departureAt: event.target.value })} /></label>
      <label>PRICE<input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
      <label><span><input type="checkbox" checked={form.emptyLeg} onChange={(event) => setForm({ ...form, emptyLeg: event.target.checked })} /> Empty leg</span></label>
      <LuxuryButton onClick={submit}>PUBLISH</LuxuryButton>
      {message && <p className="notice">{message}</p>}
    </div>
  );
}

function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/bookings").then((res) => res.json()).then((json) => {
      const filtered = (json.bookings || []).filter((b: any) => b.status === "REQUESTED");
      setBookings(filtered);
    });
  }, []);

  async function confirm(id: string) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "OPERATOR_CONFIRMED" }),
    });
    setBookings((items) => items.map((item) => item.id === id ? { ...item, status: "OPERATOR_CONFIRMED" } : item));
  }

  return (
    <div className="fleetRows">
      {bookings.slice(0, 8).map((booking) => (
        <div className="fleetRow" key={booking.id}>
          <span><b>{booking.origin} to {booking.destination}</b><small className="muted">Rs {(booking.price / 100000).toFixed(1)}L / {booking.status}</small></span>
          {booking.status === "REQUESTED" ? <button className="pill" onClick={() => confirm(booking.id)}>Review</button> : <Link className="pill" href={`/booking/${booking.id}`}>Open</Link>}
        </div>
      ))}
      {!bookings.length && <p className="muted">No booking requests.</p>}
    </div>
  );
}

function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/operator/notifications").then((res) => res.json()).then((json) => setNotifications(json.notifications || []));
  }, []);
  return (
    <div className="fleetRows">
      {notifications.slice(0, 8).map((notification) => (
        <div className="fleetRow" key={notification.id}>
          <span><b>{notification.title}</b><small className="muted">{notification.body}</small></span>
        </div>
      ))}
      {!notifications.length && <p className="muted">No notifications.</p>}
    </div>
  );
}
