/**
 * Airport reference data import.
 *
 * Sources (vendored in data/reference, see data/reference/SOURCES.md):
 *  - OurAirports (public domain): airports, runways, regions, countries
 *  - mwgg/Airports (MIT): IANA timezones by ICAO code
 *
 * Scope: large + medium airports worldwide, plus every open airfield and heliport in the
 * launch markets (India, UAE) because helicopter and small-field charter is common there.
 * Idempotent: keyed by OurAirports id (sourceRef). Timezone is only filled from the dataset or,
 * for single-timezone countries, from the country itself; otherwise left empty.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { AirportKind } from '@/generated/prisma/client';
import { prisma } from '@/server/db/client';

const LAUNCH_MARKETS = new Set(['IN', 'AE']);
const SINGLE_TZ: Record<string, string> = { IN: 'Asia/Kolkata', AE: 'Asia/Dubai', SG: 'Asia/Singapore', QA: 'Asia/Qatar', BH: 'Asia/Bahrain', OM: 'Asia/Muscat', LK: 'Asia/Colombo', NP: 'Asia/Kathmandu', MV: 'Indian/Maldives', BT: 'Asia/Thimphu', BD: 'Asia/Dhaka', GB: 'Europe/London', FR: 'Europe/Paris', CH: 'Europe/Zurich', IT: 'Europe/Rome', DE: 'Europe/Berlin', SA: 'Asia/Riyadh', KW: 'Asia/Kuwait', TH: 'Asia/Bangkok', JP: 'Asia/Tokyo' };
const KIND: Record<string, AirportKind> = {
  large_airport: 'LARGE_AIRPORT',
  medium_airport: 'MEDIUM_AIRPORT',
  small_airport: 'SMALL_AIRPORT',
  heliport: 'HELIPORT',
  seaplane_base: 'SEAPLANE_BASE',
  balloonport: 'BALLOONPORT',
};
const RANK: Record<string, number> = { large_airport: 30, medium_airport: 20, small_airport: 10, heliport: 6, seaplane_base: 4, balloonport: 2 };

type Row = Record<string, string>;
const csv = async (dir: string, file: string): Promise<Row[]> => parse(await readFile(path.join(dir, file), 'utf8'), { columns: true, skip_empty_lines: true }) as Row[];
const icaoLike = (s: string | undefined) => (s && /^[A-Z]{4}$/.test(s) ? s : null);

export async function importAirports(dir = path.resolve('data/reference')) {
  const [airports, runways, regions, countries] = await Promise.all([csv(dir, 'airports.csv'), csv(dir, 'runways.csv'), csv(dir, 'regions.csv'), csv(dir, 'countries.csv')]);
  const tz = JSON.parse(await readFile(path.join(dir, 'mwgg-airports.json'), 'utf8')) as Record<string, { tz?: string }>;

  const selected = airports.filter((a) => a.type !== 'closed' && KIND[a.type!] && (a.type === 'large_airport' || a.type === 'medium_airport' || LAUNCH_MARKETS.has(a.iso_country!)));

  // Longest open runway per airport.
  const longest = new Map<string, number>();
  for (const r of runways) {
    if (r.closed === '1') continue;
    const len = Number(r.length_ft);
    if (Number.isFinite(len) && len > (longest.get(r.airport_ref!) ?? 0)) longest.set(r.airport_ref!, len);
  }

  // Countries referenced by selected airports.
  const neededCountries = new Set(selected.map((a) => a.iso_country!));
  for (const c of countries) {
    if (!neededCountries.has(c.code!)) continue;
    await prisma.country.upsert({ where: { code: c.code! }, create: { code: c.code!, name: c.name! }, update: {} });
  }
  const regionIds = new Map<string, string>();
  const neededRegions = new Set(selected.map((a) => a.iso_region!));
  const existingRegions = await prisma.region.findMany();
  for (const r of existingRegions) regionIds.set(r.code, r.id);
  for (const r of regions) {
    if (!neededRegions.has(r.code!) || regionIds.has(r.code!)) continue;
    const created = await prisma.region.create({ data: { countryCode: r.iso_country!, code: r.code!, name: r.name! } });
    regionIds.set(created.code, created.id);
  }

  // ICAO must be unique: when two rows claim one code, the higher-ranked keeps it.
  const ranked = [...selected].sort((a, b) => (RANK[b.type!] ?? 0) - (RANK[a.type!] ?? 0));
  const icaoTaken = new Set<string>();
  const existing = new Map((await prisma.airport.findMany({ select: { id: true, sourceRef: true } })).map((a) => [a.sourceRef, a.id]));
  let created = 0;
  let updated = 0;
  let missingTz = 0;
  const toCreate = [];
  for (const a of ranked) {
    let icao = icaoLike(a.icao_code) ?? icaoLike(a.gps_code) ?? icaoLike(a.ident);
    if (icao && icaoTaken.has(icao)) icao = null;
    if (icao) icaoTaken.add(icao);
    const iata = a.iata_code && /^[A-Z]{3}$/.test(a.iata_code) ? a.iata_code : null;
    const zone = (icao && tz[icao]?.tz) || tz[a.ident!]?.tz || SINGLE_TZ[a.iso_country!] || null;
    if (!zone) missingTz += 1;
    const data = {
      icao,
      iata,
      localCode: a.local_code || null,
      name: a.name!,
      city: a.municipality || null,
      countryCode: a.iso_country!,
      regionId: regionIds.get(a.iso_region!) ?? null,
      kind: KIND[a.type!]!,
      latitude: a.latitude_deg!,
      longitude: a.longitude_deg!,
      elevationFt: a.elevation_ft ? Math.round(Number(a.elevation_ft)) : null,
      timezone: zone,
      longestRunwayFt: longest.get(a.id!) ?? null,
      hasScheduledService: a.scheduled_service === 'yes',
      searchRank: (RANK[a.type!] ?? 0) + (LAUNCH_MARKETS.has(a.iso_country!) ? 5 : 0) + (a.scheduled_service === 'yes' ? 3 : 0),
      searchText: [icao, iata, a.name, a.municipality, a.keywords].filter(Boolean).join(' ').toLowerCase(),
      sourceRef: `ourairports:${a.id}`,
    };
    const id = existing.get(data.sourceRef);
    if (id) {
      await prisma.airport.update({ where: { id }, data });
      updated += 1;
    } else {
      toCreate.push(data);
      created += 1;
    }
  }
  for (let i = 0; i < toCreate.length; i += 1000) await prisma.airport.createMany({ data: toCreate.slice(i, i + 1000) });
  return { selected: selected.length, created, updated, missingTimezone: missingTz };
}
