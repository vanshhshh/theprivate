import { NextResponse } from 'next/server';
import { searchAirports } from '@/server/services/airports';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const airports = await searchAirports(q, 8);
  return NextResponse.json({ airports }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
