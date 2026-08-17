"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Airport, airportCode, findAirport, searchAirports } from "@/lib/airports";
import { imageForSeed } from "@/lib/media";

export function Button({ children, href, variant = "dark", onClick, disabled, className }: {
  children: React.ReactNode;
  href?: string;
  variant?: "dark" | "light" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const cls = `btn btn-${variant}${className ? ` ${className}` : ""}`;
  if (href) return <Link className={cls} href={href}>{children}</Link>;
  return <button className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function AirportDisplay({ value }: { value?: string | null }) {
  const airport = findAirport(value);
  return (
    <span>
      <b>{airport.city}</b>
      <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)" }}>{airport.name}</span>
    </span>
  );
}

export function RouteDisplay({ from, to }: { from?: string | null; to?: string | null }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
      <b style={{ fontFamily: "var(--serif)", fontSize: "var(--text-2xl)", fontWeight: 500, letterSpacing: "var(--tracking-tight)" }}>{airportCode(from)}</b>
      <span style={{ display: "block", width: 40, height: 1, background: "var(--accent)" }} />
      <b style={{ fontFamily: "var(--serif)", fontSize: "var(--text-2xl)", fontWeight: 500, letterSpacing: "var(--tracking-tight)" }}>{airportCode(to)}</b>
    </span>
  );
}

export function PriceDisplay({ value, label = "ESTIMATED" }: { value: number; label?: string }) {
  return (
    <span className="price-block">
      <span className="label">{label}</span>
      <span className="value">Rs {(value / 100000).toFixed(1)}L</span>
    </span>
  );
}

export function EmptyLegBadge() {
  return <span className="empty-leg-badge">Empty leg</span>;
}

export function AirportCombobox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const selected = findAirport(value);
  const results = useMemo(() => searchAirports(query), [query]);

  function choose(airport: Airport) {
    onChange(airport.city);
    setQuery(airport.city);
    setOpen(false);
  }

  return (
    <div className="search-field">
      <label>{label}</label>
      <button type="button" className="search-field-trigger" onClick={() => setOpen(true)}>
        <span className="value">{selected.city}</span>
        <span className="hint">{selected.name}</span>
      </button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <span className="eyebrow">{label}</span>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-sm btn-ghost">Close</button>
            </div>
            <input
              autoFocus
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, airport, country or IATA code"
            />
            <div className="airport-list">
              {results.map((airport) => (
                <button type="button" key={airport.iata} className="airport-option" onClick={() => choose(airport)}>
                  <span>
                    <span className="name">{airport.name}</span>
                    <span className="city">{airport.city}</span>
                    <span className="country">{airport.country}</span>
                  </span>
                  <span className="code">{airport.iata}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDateLabel(value?: string) {
  if (!value) return { day: "Select", month: "Date" };
  const date = new Date(`${value}T00:00:00`);
  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase(),
    month: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
  };
}

export function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const labelDate = formatDateLabel(value);
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = start.getDay();
    const items: Date[] = [];
    for (let i = 0; i < offset; i++) items.push(new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
    for (let i = 1; i <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); i++) items.push(new Date(month.getFullYear(), month.getMonth(), i));
    while (items.length % 7) items.push(new Date(month.getFullYear(), month.getMonth() + 1, items.length));
    return items;
  }, [month]);

  return (
    <div className="search-field">
      <label>{label}</label>
      <button type="button" className="search-field-trigger" onClick={() => setOpen(true)}>
        <span className="value">{labelDate.day}</span>
        <span className="hint">{labelDate.month}</span>
      </button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cal-header">
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn btn-sm btn-ghost">Prev</button>
              <b>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</b>
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn btn-sm btn-ghost">Next</button>
            </div>
            <div className="cal-grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div key={`${day}-${index}`} className="cal-weekday">{day}</div>
              ))}
              {days.map((day) => {
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isSelected = selected && toDateValue(day) === toDateValue(selected);
                const isToday = toDateValue(day) === toDateValue(new Date());
                return (
                  <button
                    type="button"
                    key={toDateValue(day)}
                    className={`cal-day${isCurrentMonth ? "" : " dim"}${isSelected ? " selected" : ""}${isToday && !isSelected ? " today" : ""}`}
                    onClick={() => {
                      onChange(toDateValue(day));
                      setOpen(false);
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PassengerSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="pax-selector">
      <label>Passengers</label>
      <div className="pax-controls">
        <button type="button" className="pax-btn" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease passengers">−</button>
        <span className="pax-value">{String(value).padStart(2, "0")}</span>
        <button type="button" className="pax-btn" onClick={() => onChange(Math.min(30, value + 1))} aria-label="Increase passengers">+</button>
      </div>
    </div>
  );
}

export function SearchPanel({ defaultFrom = "Delhi", defaultTo = "Dubai", defaultPassengers = 6, defaultDate = "", compact = false }: {
  defaultFrom?: string;
  defaultTo?: string;
  defaultPassengers?: number;
  defaultDate?: string;
  compact?: boolean;
}) {
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [date, setDate] = useState(defaultDate);
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(defaultPassengers);

  const searchHref = useMemo(() => {
    const params = new URLSearchParams({ from, to, pax: String(passengers), tripType });
    if (date) params.set("date", date);
    if (tripType === "round-trip" && returnDate) params.set("returnDate", returnDate);
    return `/search?${params.toString()}`;
  }, [date, from, passengers, returnDate, to, tripType]);

  return (
    <div className={`search-panel${compact ? " search-panel--compact" : ""}`}>
      <div style={{ display: "inline-flex", border: "var(--border)", marginBottom: "var(--space-3)" }}>
        <button
          type="button"
          style={{
            padding: "var(--space-2) var(--space-4)",
            border: "none",
            background: tripType === "one-way" ? "var(--ink)" : "transparent",
            color: tripType === "one-way" ? "var(--white)" : "var(--muted)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-out)",
          }}
          onClick={() => setTripType("one-way")}
        >
          One-way
        </button>
        <button
          type="button"
          style={{
            padding: "var(--space-2) var(--space-4)",
            border: "none",
            background: tripType === "round-trip" ? "var(--ink)" : "transparent",
            color: tripType === "round-trip" ? "var(--white)" : "var(--muted)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-out)",
          }}
          onClick={() => setTripType("round-trip")}
        >
          Round trip
        </button>
      </div>
      <div className="search-row">
        <AirportCombobox label="From" value={from} onChange={setFrom} />
        <AirportCombobox label="To" value={to} onChange={setTo} />
        <DatePicker label="Departure" value={date} onChange={setDate} />
        {tripType === "round-trip" && <DatePicker label="Return" value={returnDate} onChange={setReturnDate} />}
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
        <Button href={searchHref}>Search aircraft</Button>
        <Button variant="ghost" href={`/charter/request?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pax=${passengers}`}>Request charter</Button>
        <div style={{ marginLeft: "auto" }}>
          <PassengerSelector value={passengers} onChange={setPassengers} />
        </div>
      </div>
    </div>
  );
}

export function AircraftCard({ aircraft, href, from, to }: { aircraft: any; href: string; from: string; to: string }) {
  return (
    <article className="aircraft-card">
      <Link href={href} className="aircraft-card-image">
        <Image src={imageForSeed(aircraft.registration || aircraft.model)} alt={aircraft.model || "Private aircraft"} fill sizes="(max-width: 860px) 100vw, 420px" />
        {aircraft.availability?.emptyLeg && <EmptyLegBadge />}
      </Link>
      <div className="aircraft-card-body">
        <div>
          <span className="eyebrow">{aircraft.availability?.emptyLeg ? "Empty leg" : "Whole charter"}</span>
          <h3>{aircraft.model || aircraft.type || "Private aircraft"}</h3>
          <p className="muted" style={{ fontSize: "var(--text-sm)" }}>{aircraft.seats || "-"} seats / {aircraft.registration}</p>
        </div>
        <div className="aircraft-meta">
          <RouteDisplay from={from} to={to} />
          <span>Approx. charter estimate</span>
        </div>
        <div className="aircraft-footer">
          <PriceDisplay value={aircraft.quote || aircraft.estimate || 0} />
          <Button variant="light" href={href}>View aircraft</Button>
        </div>
      </div>
    </article>
  );
}

export function ClaimProfileCard({ operator, children }: { operator: any; children?: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "grid", gridTemplateColumns: "minmax(0, .85fr) minmax(360px, 1fr)", gap: "var(--space-6)", alignItems: "start" }}>
      <div>
        <span className="eyebrow">Prepared profile</span>
        <h3 style={{ fontSize: "clamp(36px, 5vw, 64px)", marginTop: "var(--space-3)" }}>{operator.name}</h3>
        <p className="muted" style={{ marginTop: "var(--space-2)" }}>{operator.aircraft.length} aircraft preloaded from aviation records.</p>
      </div>
      <div style={{ borderTop: "var(--border)", display: "grid", gap: 0 }}>
        {operator.aircraft.slice(0, 5).map((aircraft: any) => (
          <div key={aircraft.id || aircraft.registration} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
            <span style={{ display: "grid", gap: "var(--space-1)" }}>
              <b style={{ fontSize: "var(--text-sm)" }}>{aircraft.model || aircraft.type || "Aircraft"}</b>
              <small className="muted">{aircraft.registration}</small>
            </span>
            <strong style={{ color: "var(--accent-dark)", fontFamily: "var(--serif)", fontSize: "var(--text-xl)" }}>{aircraft.seats || "-"} seats</strong>
          </div>
        ))}
      </div>
      {children && <div style={{ gridColumn: "1 / -1" }}>{children}</div>}
    </div>
  );
}
