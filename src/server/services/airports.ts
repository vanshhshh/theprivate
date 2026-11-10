import 'server-only';
import { prisma } from '@/server/db/client';

export interface AirportOption {
  id: string;
  icao: string | null;
  iata: string | null;
  name: string;
  city: string | null;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string | null;
  kind: string;
}

/**
 * Airport search: exact ICAO/IATA first, then prefix and trigram similarity on
 * "icao iata name city", ranked by airport size and launch-market relevance. Index-backed.
 */
export async function searchAirports(q: string, limit = 8): Promise<AirportOption[]> {
  const term = q.trim().toLowerCase().slice(0, 60);
  if (term.length < 2) return [];
  const upper = term.toUpperCase();
  const rows = await prisma.$queryRaw<
    { id: string; icao: string | null; iata: string | null; name: string; city: string | null; countryCode: string; latitude: string; longitude: string; timezone: string | null; kind: string }[]
  >`
    SELECT id, icao, iata, name, city, "countryCode", latitude::text, longitude::text, timezone, kind::text
    FROM "Airport"
    WHERE "isActive" AND kind <> 'CLOSED' AND (
      icao = ${upper} OR iata = ${upper}
      OR "searchText" LIKE ${`%${term}%`}
      OR similarity("searchText", ${term}) > 0.25
    )
    ORDER BY
      (coalesce(icao, '') = ${upper} OR coalesce(iata, '') = ${upper}) DESC,
      (lower(coalesce(city, '')) LIKE ${`${term}%`} OR lower(name) LIKE ${`${term}%`}) DESC,
      "searchRank" DESC,
      similarity("searchText", ${term}) DESC
    LIMIT ${Math.min(limit, 20)}`;
  return rows.map((r) => ({ ...r, lat: Number(r.latitude), lon: Number(r.longitude) }));
}

export async function getAirports(ids: string[]) {
  const rows = await prisma.airport.findMany({ where: { id: { in: ids } } });
  return new Map(rows.map((a) => [a.id, a]));
}

export function airportLabel(a: { icao: string | null; iata: string | null; name: string; city: string | null }) {
  const code = a.iata ?? a.icao ?? '';
  return `${a.city ?? a.name}${code ? ` (${code})` : ''}`;
}
