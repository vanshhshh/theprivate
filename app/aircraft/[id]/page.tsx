import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { calculateAircraftPrice } from "@/lib/pricing";
import { airportCode, findAirport } from "@/lib/airports";
import { Button, PriceDisplay, RouteDisplay } from "@/components/luxury";
import { imageForSeed } from "@/lib/media";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aircraft = await db.aircraft.findUnique({ where: { id }, include: { operator: true } });
  if (!aircraft) return {};
  return {
    title: `${aircraft.model || aircraft.registration} - ThePrivate`,
    description: `${aircraft.model || "Private aircraft"} available through ThePrivate.`,
  };
}

export default async function AircraftDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const from = String(query.from || "Delhi");
  const to = String(query.to || "Dubai");
  const passengers = Number(query.pax || 6);
  const date = String(query.date || "");
  const availabilityId = query.availability ? String(query.availability) : "";

  const aircraft = await db.aircraft.findUnique({
    where: { id },
    include: {
      operator: { include: { pricing: true } },
      availability: availabilityId ? { where: { id: availabilityId }, take: 1 } : { take: 0 },
    },
  });
  if (!aircraft) notFound();

  const listing = aircraft.availability[0];
  const price = listing?.price || (await calculateAircraftPrice(aircraft, from, to)).finalPrice;
  const bookingParams = new URLSearchParams({
    aircraft: aircraft.id,
    from,
    to,
    pax: String(passengers),
  });
  if (date) bookingParams.set("date", date);
  if (availabilityId) bookingParams.set("availability", availabilityId);

  return (
    <main>
      <section className="detail-hero">
        <div className="detail-hero-image">
          <Image src={imageForSeed(aircraft.registration || aircraft.model)} alt={aircraft.model || aircraft.registration} fill priority sizes="100vw" />
        </div>
        <div className="detail-hero-content">
          <span className="eyebrow">Private aircraft</span>
          <h1>{aircraft.model || aircraft.type || "Private aircraft"}</h1>
          <p className="subtitle">{aircraft.registration} / {aircraft.seats || "-"} passengers / estimated price</p>
          <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-5)", flexWrap: "wrap", alignItems: "center" }}>
            <RouteDisplay from={findAirport(from).city} to={findAirport(to).city} />
            <span className="muted" style={{ fontSize: "var(--text-sm)" }}>{findAirport(from).name} to {findAirport(to).name}</span>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="shell">
          <div className="detail-stats">
            <div>
              <span className="label">Route</span>
              <span className="value">{airportCode(from)} to {airportCode(to)}</span>
            </div>
            <div>
              <span className="label">Departure</span>
              <span className="value" style={{ fontSize: "var(--text-2xl)" }}>{date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase() : "Flexible"}</span>
            </div>
            <div>
              <span className="label">Seats</span>
              <span className="value">{aircraft.seats || "-"}</span>
            </div>
            <div>
              <span className="label">Range</span>
              <span className="value" style={{ fontSize: "var(--text-2xl)" }}>Confirmed before flight</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, .85fr)", gap: "var(--space-7)", alignItems: "start" }}>
          <div className="card">
            <span className="eyebrow">Aircraft</span>
            <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>Private cabin, clear trip request.</h3>
            <p className="muted" style={{ maxWidth: 480, lineHeight: "var(--leading-relaxed)" }}>
              Request this aircraft for your route. Final availability and price are confirmed before payment.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-5)", padding: "var(--space-4) 0", borderTop: "var(--border-subtle)", borderBottom: "var(--border-subtle)" }}>
              <RouteDisplay from={findAirport(from).city} to={findAirport(to).city} />
              <span className="muted" style={{ fontSize: "var(--text-sm)" }}>{findAirport(from).name} to {findAirport(to).name}</span>
            </div>
            <div style={{ marginTop: "var(--space-5)" }}>
              <p className="muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                Operator: <span style={{ color: "var(--ink)", fontWeight: 600 }}>{aircraft.operator.name}</span>
                {aircraft.operator.verified && <span className="badge badge-dark" style={{ marginLeft: "var(--space-2)" }}>Verified</span>}
              </p>
            </div>
          </div>
          <div style={{ background: "var(--ink)", color: "var(--white)", padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <PriceDisplay value={price} />
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>
              Estimated price. Final confirmation happens before payment.
            </p>
            <div>
              <Button href={`/booking/new?${bookingParams.toString()}`} variant="light">Request booking</Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
