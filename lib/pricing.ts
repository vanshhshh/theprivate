import { db } from "./prisma";

const airports: Record<string, [number, number, "IN" | "INTL"]> = {
  delhi: [28.5562, 77.1, "IN"],
  mumbai: [19.0896, 72.8656, "IN"],
  bangalore: [13.1986, 77.7066, "IN"],
  bengaluru: [13.1986, 77.7066, "IN"],
  hyderabad: [17.2403, 78.4294, "IN"],
  chennai: [12.9941, 80.1709, "IN"],
  kolkata: [22.6547, 88.4467, "IN"],
  goa: [15.3808, 73.8314, "IN"],
  jaipur: [26.8242, 75.8122, "IN"],
  ahmedabad: [23.0772, 72.6347, "IN"],
  udaipur: [24.6177, 73.8961, "IN"],
  srinagar: [34.0046, 74.7973, "IN"],
  dubai: [25.2532, 55.3657, "INTL"],
  abu_dhabi: [24.433, 54.6511, "INTL"],
  doha: [25.2731, 51.6081, "INTL"],
  singapore: [1.3644, 103.9915, "INTL"],
  bangkok: [13.69, 100.7501, "INTL"],
  maldives: [4.1918, 73.5291, "INTL"],
  london: [51.47, -0.4543, "INTL"],
  paris: [49.0097, 2.5479, "INTL"],
  zurich: [47.4582, 8.5555, "INTL"],
};

function key(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "_");
}

export function distanceKm(origin: string, destination: string) {
  const p1 = airports[key(origin)];
  const p2 = airports[key(destination)];
  if (!p1 || !p2) return null;
  const radius = 6371;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function isInternational(origin: string, destination: string) {
  const p1 = airports[key(origin)];
  const p2 = airports[key(destination)];
  if (!p1 || !p2) return /dubai|abu|doha|singapore|bangkok|maldives|london|paris|zurich/i.test(`${origin} ${destination}`);
  return p1[2] !== "IN" || p2[2] !== "IN";
}

export function customerPrice(value: number) {
  return Math.ceil(value / 1000) * 1000;
}

function fallbackHourlyRate(aircraft: any) {
  const seats = Number(aircraft.seats || 6);
  const model = String(`${aircraft.model || ""} ${aircraft.type || ""}`).toLowerCase();
  let base = 260000;
  if (/gulfstream|global|falcon 7|falcon 8|legacy 650|embraer 650|challenger|citation x|heavy|long/.test(model) || seats >= 14) base = 475000;
  else if (/falcon 2000|falcon2000|legacy 600|legacy600|super midsize/.test(model) || seats >= 10) base = 395000;
  else if (/legacy|hawker|learjet|citation|falcon|embraer|medium|mid/.test(model) || seats >= 8) base = 315000;
  else if (/king air|b200|pc-12|caravan|turboprop|beech/.test(model) || seats <= 7) base = 185000;
  const seed = String(aircraft.registration || aircraft.model || aircraft.id || "aircraft");
  const hash = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const modifier = 0.9 + (hash % 21) / 100;
  return Math.round((base * modifier) / 5000) * 5000;
}

function estimatedCruiseSpeed(aircraft: any) {
  const model = String(`${aircraft.model || ""} ${aircraft.type || ""}`).toLowerCase();
  if (/king air|b200|pc-12|caravan|turboprop|beech/.test(model)) return 500;
  if (/global|gulfstream|falcon|legacy|challenger|citation|hawker|learjet/.test(model)) return 780;
  return 650;
}

function routeFitScore(aircraft: any, passengers: number, international: boolean) {
  const seats = Number(aircraft.seats || 0);
  const slack = Math.max(0, seats - passengers);
  const model = String(`${aircraft.model || ""} ${aircraft.type || ""}`).toLowerCase();
  const jetBonus = /global|gulfstream|falcon|legacy|challenger|citation|hawker|learjet/.test(model) ? 0 : 8;
  const internationalPenalty = international && /king air|b200|pc-12|caravan|turboprop|beech/.test(model) ? 18 : 0;
  return slack + jetBonus + internationalPenalty;
}

export async function calculateAircraftPrice(aircraft: any, origin: string, destination: string) {
  const pricing = aircraft.operator?.pricing;
  const distance = distanceKm(origin, destination) ?? 800;
  const speed = estimatedCruiseSpeed(aircraft);
  const flightHours = (distance / speed) * 1.15;
  const billableHours = Math.max(Number(pricing?.defaultMinHours || aircraft.minHours || 2), flightHours);
  const hourlyRate = Number(aircraft.hourlyRate || pricing?.defaultHourlyRate || 0);
  const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : fallbackHourlyRate(aircraft);
  const operatingCost = effectiveHourlyRate * billableHours;
  const international = isInternational(origin, destination);
  const handling = international ? Number(pricing?.internationalHandling || 275000) : Number(pricing?.domesticHandling || 85000);
  const crew = Number(pricing?.crewDaily || (international ? 125000 : 55000));
  const fuelSurcharge = (operatingCost * Number(pricing?.fuelSurchargePercent || 0)) / 100;
  const operatorBuffer = Number(aircraft.operatorBuffer || pricing?.operatorBuffer || 0);
  const operatorSubtotal = operatingCost + handling + crew + fuelSurcharge + operatorBuffer;
  const platformFee = (operatorSubtotal * Number(pricing?.platformMarkupPercent ?? 8)) / 100;
  const minimum = Number(pricing?.minQuote || 0);
  const finalPrice = customerPrice(Math.max(operatorSubtotal + platformFee, minimum));

  return {
    finalPrice,
    internal: {
      version: "pricing.v1",
      distanceKm: distance,
      international,
      billableHours,
      hourlyRate: effectiveHourlyRate,
      operatingCost,
      handling,
      crew,
      fuelSurcharge,
      operatorBuffer,
      platformFee,
      minimum,
      calculatedAt: new Date().toISOString(),
    },
  };
}

export async function quoteAircraft(aircraft: any, origin: string, destination: string) {
  return (await calculateAircraftPrice(aircraft, origin, destination)).finalPrice;
}

export async function quoteSearch(origin: string, destination: string, passengers: number, date?: Date, options: { emptyLegOnly?: boolean } = {}) {
  const now = new Date();
  const availabilityWhere: any = {
    status: { in: ["ACTIVE", "PUBLISHED"] },
    departureAt: { gte: now },
    ...(options.emptyLegOnly ? { emptyLeg: true } : {}),
    ...(date
      ? {
          departureAt: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        }
      : {}),
  };

  const international = isInternational(origin, destination);
  const aircraft = (await db.aircraft.findMany({
    where: {
      active: true,
      seats: { gte: passengers },
      operator: { active: true },
    },
    include: {
      operator: { include: { pricing: true } },
      availability: {
        where: availabilityWhere,
        orderBy: { departureAt: "asc" },
        take: 3,
      },
    },
    take: 120,
  })) as any[];

  const results = [];
  for (const item of aircraft) {
    const available = item.availability.find((listing: any) => {
      const sameRoute =
        listing.origin.toLowerCase() === origin.toLowerCase() &&
        listing.destination.toLowerCase() === destination.toLowerCase();
      return sameRoute && listing.seats >= passengers;
    });
    if (options.emptyLegOnly && !available?.emptyLeg) continue;
    const calculated = available
      ? { finalPrice: available.price }
      : await calculateAircraftPrice(item, origin, destination);

    results.push({
      id: item.id,
      registration: item.registration,
      model: item.model,
      type: item.type,
      seats: item.seats,
      verified: item.verified,
      operator: { id: item.operator.id, name: item.operator.name, verified: item.operator.verified },
      route: { origin, destination },
      estimateLabel: available ? "Listed price" : "Estimated price",
      quote: calculated.finalPrice,
      availability: available
        ? {
            id: available.id,
            departureAt: available.departureAt,
            emptyLeg: available.emptyLeg,
            status: available.status,
          }
        : null,
    });
  }

  return results
    .sort((a, b) => {
      const availabilityScore = Number(Boolean(b.availability)) - Number(Boolean(a.availability));
      if (availabilityScore) return availabilityScore;
      return routeFitScore(a, passengers, international) - routeFitScore(b, passengers, international) || a.quote - b.quote;
    })
    .slice(0, 18);
}
