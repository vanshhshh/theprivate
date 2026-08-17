import { db } from "./prisma";

const FALLBACK_AIRPORTS: Record<string, { latitude: number; longitude: number; country: string }> = {
  delhi: { latitude: 28.5562, longitude: 77.1, country: "India" },
  mumbai: { latitude: 19.0896, longitude: 72.8656, country: "India" },
  bangalore: { latitude: 13.1986, longitude: 77.7066, country: "India" },
  bengaluru: { latitude: 13.1986, longitude: 77.7066, country: "India" },
  hyderabad: { latitude: 17.2403, longitude: 78.4294, country: "India" },
  chennai: { latitude: 12.9941, longitude: 80.1709, country: "India" },
  kolkata: { latitude: 22.6547, longitude: 88.4467, country: "India" },
  goa: { latitude: 15.3808, longitude: 73.8314, country: "India" },
  jaipur: { latitude: 26.8242, longitude: 75.8122, country: "India" },
  ahmedabad: { latitude: 23.0772, longitude: 72.6347, country: "India" },
  udaipur: { latitude: 24.6177, longitude: 73.8961, country: "India" },
  srinagar: { latitude: 34.0046, longitude: 74.7973, country: "India" },
  dubai: { latitude: 25.2532, longitude: 55.3657, country: "United Arab Emirates" },
  abu_dhabi: { latitude: 24.433, longitude: 54.6511, country: "United Arab Emirates" },
  doha: { latitude: 25.2731, longitude: 51.6081, country: "Qatar" },
  singapore: { latitude: 1.3644, longitude: 103.9915, country: "Singapore" },
  bangkok: { latitude: 13.69, longitude: 100.7501, country: "Thailand" },
  maldives: { latitude: 4.1918, longitude: 73.5291, country: "Maldives" },
  london: { latitude: 51.47, longitude: -0.4543, country: "United Kingdom" },
  paris: { latitude: 49.0097, longitude: 2.5479, country: "France" },
  zurich: { latitude: 47.4582, longitude: 8.5555, country: "Switzerland" },
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const AIRPORT_CACHE_TTL = 5 * 60 * 1000;
let airportCache: { expires: number; byCity: Map<string, { latitude: number; longitude: number; country: string }> } | null = null;

async function getAirports() {
  if (airportCache && Date.now() < airportCache.expires) return airportCache.byCity;
  try {
    const rows = await db.airport.findMany({ where: { active: true } });
    const byCity = new Map<string, { latitude: number; longitude: number; country: string }>();
    for (const a of rows) {
      if (a.latitude != null && a.longitude != null) {
        byCity.set(a.city.toLowerCase().trim(), { latitude: a.latitude, longitude: a.longitude, country: a.country });
        byCity.set(a.iata.toLowerCase().trim(), { latitude: a.latitude, longitude: a.longitude, country: a.country });
      }
    }
    airportCache = { expires: Date.now() + AIRPORT_CACHE_TTL, byCity };
    return byCity;
  } catch {
    airportCache = { expires: Date.now() + AIRPORT_CACHE_TTL, byCity: new Map(Object.entries(FALLBACK_AIRPORTS)) };
    return airportCache.byCity;
  }
}

export async function distanceKm(origin: string, destination: string) {
  const airports = await getAirports();
  const p1 = airports.get(origin.toLowerCase().trim());
  const p2 = airports.get(destination.toLowerCase().trim());
  if (!p1 || !p2) return null;
  return haversine(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
}

export async function isInternational(origin: string, destination: string) {
  const airports = await getAirports();
  const p1 = airports.get(origin.toLowerCase().trim());
  const p2 = airports.get(destination.toLowerCase().trim());
  if (!p1 || !p2) return origin.toLowerCase().includes("dubai") || origin.toLowerCase().includes("london") || destination.toLowerCase().includes("dubai") || destination.toLowerCase().includes("london");
  return p1.country !== "India" || p2.country !== "India";
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
  const distance = (await distanceKm(origin, destination)) ?? 800;
  const speed = estimatedCruiseSpeed(aircraft);
  const flightHours = (distance / speed) * 1.15;
  const billableHours = Math.max(Number(pricing?.defaultMinHours || aircraft.minHours || 2), flightHours);
  const hourlyRate = Number(aircraft.hourlyRate || pricing?.defaultHourlyRate || 0);
  const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : fallbackHourlyRate(aircraft);
  const operatingCost = effectiveHourlyRate * billableHours;
  const international = await isInternational(origin, destination);
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
      version: "pricing.v2",
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

  const international = await isInternational(origin, destination);
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
