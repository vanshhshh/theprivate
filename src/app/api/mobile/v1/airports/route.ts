import { airportOption } from '@/server/mobile/dto';
import { mobile, preflight } from '@/server/mobile/http';
import { searchAirports } from '@/server/services/airports';

export const OPTIONS = preflight;

/** Airport search by name, city, IATA or ICAO (at most 8 results). */
export const GET = mobile({ auth: 'optional', cache: 'public:300' }, async ({ req }) => {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return (await searchAirports(q, 8)).map(airportOption);
});
