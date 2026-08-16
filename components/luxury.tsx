"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Airport, airportCode, findAirport, searchAirports } from "@/lib/airports";
import { imageForSeed } from "@/lib/media";

export function LuxuryButton({ children, href, variant = "dark", onClick, disabled }: {
  children: React.ReactNode;
  href?: string;
  variant?: "dark" | "light" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = `luxuryButton ${variant}`;
  if (href) return <Link className={className} href={href}>{children}</Link>;
  return <button className={className} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="sectionHeading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function AirportDisplay({ value }: { value?: string | null }) {
  const airport = findAirport(value);
  return (
    <span className="airportDisplay">
      <b>{airport.city}</b>
      <small>{airport.name}</small>
    </span>
  );
}

export function RouteDisplay({ from, to }: { from?: string | null; to?: string | null }) {
  return (
    <span className="routeDisplay">
      <b>{airportCode(from)}</b>
      <i />
      <b>{airportCode(to)}</b>
    </span>
  );
}

export function PriceDisplay({ value, label = "ESTIMATED PRICE" }: { value: number; label?: string }) {
  return (
    <span className="priceDisplay">
      <small>{label}</small>
      <b>Rs {(value / 100000).toFixed(1)}L</b>
    </span>
  );
}

export function EmptyLegBadge() {
  return <span className="emptyLegBadge">EMPTY LEG</span>;
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
    <div className="airportCombo">
      <label>{label}</label>
      <button type="button" className="airportTrigger" onClick={() => setOpen(true)}>
        <span>{selected.city}</span>
        <small>{selected.name}</small>
      </button>
      {open && (
        <div className="comboOverlay" role="dialog" aria-label={`${label} airport`}>
          <div className="comboPanel">
            <div className="comboTop">
              <span>{label}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close airport search">Close</button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="City, airport, country or IATA code"
              aria-label={`${label} airport search`}
            />
            <div className="airportOptions">
              {results.map((airport) => (
                <button type="button" key={airport.iata} onClick={() => choose(airport)}>
                  <span>
                    <b>{airport.name.toUpperCase()}</b>
                    <small>{airport.city}, {airport.country}</small>
                  </span>
                  <strong>{airport.iata}</strong>
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
    <div className="datePicker">
      <label>{label}</label>
      <button type="button" className="dateTrigger" onClick={() => setOpen(true)}>
        <span>{labelDate.day}</span>
        <small>{labelDate.month}</small>
      </button>
      {open && (
        <div className="comboOverlay" role="dialog" aria-label={`${label} date picker`}>
          <div className="calendarPanel">
            <div className="calendarTop">
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">Prev</button>
              <b>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</b>
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">Next</button>
            </div>
            <div className="calendarWeek">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="calendarGrid">
              {days.map((day) => {
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isSelected = selected && toDateValue(day) === toDateValue(selected);
                const isToday = toDateValue(day) === toDateValue(new Date());
                return (
                  <button
                    type="button"
                    key={toDateValue(day)}
                    className={`${isCurrentMonth ? "" : "dim"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
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
    <div className="passengerSelector">
      <label>PASSENGERS</label>
      <div>
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease passengers">-</button>
        <span>{String(value).padStart(2, "0")}</span>
        <button type="button" onClick={() => onChange(Math.min(30, value + 1))} aria-label="Increase passengers">+</button>
      </div>
      <small>{value} passengers</small>
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
    <div className={`conciergeSearch ${compact ? "compact" : ""}`}>
      <div className="searchMode">
        <button className={tripType === "one-way" ? "active" : ""} onClick={() => setTripType("one-way")} type="button">One-way</button>
        <button className={tripType === "round-trip" ? "active" : ""} onClick={() => setTripType("round-trip")} type="button">Round trip</button>
      </div>
      <div className="conciergeGrid">
        <AirportCombobox label="FROM" value={from} onChange={setFrom} />
        <AirportCombobox label="TO" value={to} onChange={setTo} />
        <DatePicker label="DEPARTURE" value={date} onChange={setDate} />
        {tripType === "round-trip" && <DatePicker label="RETURN" value={returnDate} onChange={setReturnDate} />}
        <PassengerSelector value={passengers} onChange={setPassengers} />
      </div>
      <div className="searchSubmit">
        <LuxuryButton href={searchHref}>SEARCH AIRCRAFT</LuxuryButton>
        <LuxuryButton variant="ghost" href={`/charter/request?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pax=${passengers}`}>REQUEST CHARTER</LuxuryButton>
      </div>
    </div>
  );
}

export function AircraftCard({ aircraft, href, from, to }: { aircraft: any; href: string; from: string; to: string }) {
  return (
    <article className="aircraftCard">
      <Link href={href} className="aircraftImage">
        <Image src={imageForSeed(aircraft.registration || aircraft.model)} alt={aircraft.model || "Private aircraft"} fill sizes="(max-width: 860px) 100vw, 420px" />
        {aircraft.availability?.emptyLeg && <EmptyLegBadge />}
      </Link>
      <div className="aircraftBody">
        <div>
          <span className="microLabel">{aircraft.availability?.emptyLeg ? "Empty leg" : "Whole charter"}</span>
          <h2>{aircraft.model || aircraft.type || "Private aircraft"}</h2>
          <p className="muted">{aircraft.seats || "-"} seats / {aircraft.registration}</p>
        </div>
        <div className="aircraftMeta">
          <RouteDisplay from={from} to={to} />
          <span>Approx. charter estimate</span>
        </div>
        <div className="aircraftFooter">
          <PriceDisplay value={aircraft.quote || aircraft.estimate || 0} />
          <LuxuryButton href={href} variant="light">VIEW AIRCRAFT</LuxuryButton>
        </div>
      </div>
    </article>
  );
}

export function ClaimProfileCard({ operator, children }: { operator: any; children?: React.ReactNode }) {
  return (
    <div className="claimProfile">
      <div>
        <span className="microLabel">Prepared profile</span>
        <h2>{operator.name}</h2>
        <p>{operator.aircraft.length} aircraft preloaded from aviation records.</p>
      </div>
      <div className="fleetPreview">
        {operator.aircraft.slice(0, 5).map((aircraft: any) => (
          <div key={aircraft.id || aircraft.registration} className="fleetPreviewRow">
            <span>
              <b>{aircraft.model || aircraft.type || "Aircraft"}</b>
              <small>{aircraft.registration}</small>
            </span>
            <strong>{aircraft.seats || "-"} seats</strong>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
