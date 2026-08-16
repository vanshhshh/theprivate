import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { calculateAircraftPrice } from "@/lib/pricing";
import { airportCode, findAirport } from "@/lib/airports";
import { LuxuryButton, PriceDisplay, RouteDisplay } from "@/components/luxury";
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
      <section className="detailHero">
        <div className="detailHeroImage">
          <Image src={imageForSeed(aircraft.registration || aircraft.model)} alt={aircraft.model || aircraft.registration} fill priority sizes="100vw" />
        </div>
        <div className="shell detailHeroContent">
          <span className="eyebrow">Private aircraft</span>
          <h1>{aircraft.model || aircraft.type || "Private aircraft"}</h1>
          <p>{aircraft.registration} / {aircraft.seats || "-"} passengers / estimated price</p>
        </div>
      </section>

      <section className="section tight">
        <div className="shell">
          <div className="detailStats">
            <div><span>Route</span><b>{airportCode(from)} to {airportCode(to)}</b></div>
            <div><span>Departure</span><b>{date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase() : "Flexible"}</b></div>
            <div><span>Seats</span><b>{aircraft.seats || "-"}</b></div>
            <div><span>Range</span><b>Confirmed before flight</b></div>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="shell operatorGrid">
          <div className="surface">
            <span className="microLabel">Aircraft</span>
            <h2>Private cabin, clear trip request.</h2>
            <p className="muted">
              Request this aircraft for your route. Final availability and price are confirmed before payment.
            </p>
            <div className="aircraftMeta">
              <RouteDisplay from={findAirport(from).city} to={findAirport(to).city} />
              <span>{findAirport(from).name} to {findAirport(to).name}</span>
            </div>
          </div>
          <aside className="pricingPreview">
            <PriceDisplay value={price} />
            <p>Estimated price. Final confirmation happens before payment.</p>
            <LuxuryButton href={`/booking/new?${bookingParams.toString()}`} variant="light">REQUEST BOOKING</LuxuryButton>
          </aside>
        </div>
      </section>
    </main>
  );
}
