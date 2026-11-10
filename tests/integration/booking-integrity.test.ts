/**
 * Booking integrity against a real PostgreSQL (*_test database):
 * concurrent acceptance, expired quotes, revision mismatch, and the PAID rule.
 */
import { existsSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL!);
if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`;
process.env.DATABASE_URL = url.toString();

type Svc = typeof import('@/server/services/quotes');
let prisma: typeof import('@/server/db/client').prisma;
let quotes: Svc;
let bookings: typeof import('@/server/services/bookings');
let permissionsFor: typeof import('@/server/auth/permissions').permissionsFor;

const tag = Date.now().toString(36);

async function fixture(opts: { validMinutes?: number } = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  const customer = await prisma.user.create({ data: { email: `c-${n}-${tag}@t.dev`, name: 'Customer' } });
  const operator = await prisma.operator.create({ data: { slug: `op-${n}-${tag}`, legalName: `Op ${n}`, displayName: `Op ${n}`, countryCode: 'IN', lifecycle: 'ACTIVE' } });
  await prisma.agreement.create({ data: { operatorId: operator.id, version: 1, status: 'SIGNED', commissionBps: 800, currency: 'INR' } });
  const aircraft = await prisma.aircraft.create({ data: { registration: `VT-${n.slice(0, 3).toUpperCase()}`.replace(/[^A-Z-]/g, 'Q'), operatorId: operator.id, typeResolution: 'ADMIN_SET', seats: 8, evidenceLevel: 'PLATFORM_VERIFIED', reviewStatus: 'APPROVED', charterEligible: true, operationalStatus: 'ACTIVE' } }).catch(async () =>
    prisma.aircraft.create({ data: { registration: `T7-${n.toUpperCase().slice(0, 5)}`, operatorId: operator.id, typeResolution: 'ADMIN_SET', seats: 8, evidenceLevel: 'PLATFORM_VERIFIED', reviewStatus: 'APPROVED', charterEligible: true, operationalStatus: 'ACTIVE' } }),
  );
  const [a1, a2] = await prisma.airport.findMany({ where: { iata: { in: ['BOM', 'DEL'] } } });
  const validUntil = new Date(Date.now() + (opts.validMinutes ?? 60) * 60_000);
  const rfq = await prisma.rfq.create({
    data: {
      reference: `TP-T${n.toUpperCase()}`,
      customerId: customer.id,
      tripType: 'ONE_WAY',
      passengers: 4,
      status: 'QUOTES_AVAILABLE',
      contactName: 'Customer',
      expiresAt: new Date(Date.now() + 86_400_000),
      legs: { create: { sequence: 1, fromAirportId: a1!.id, toAirportId: a2!.id, departureDate: new Date(Date.now() + 5 * 86_400_000), passengers: 4 } },
    },
  });
  const quote = await prisma.quote.create({
    data: {
      rfqId: rfq.id,
      operatorId: operator.id,
      aircraftId: aircraft.id,
      validUntil,
      revisions: { create: { revision: 1, currency: 'INR', operatorPrice: '100000.00', platformFee: '8000.00', taxes: '0.00', customerPrice: '108000.00', validUntil, createdById: customer.id } },
    },
  });
  const viewer = { user: customer, roles: [], permissions: permissionsFor([]), memberships: [], isStaff: false } as unknown as Parameters<Svc['acceptQuote']>[0];
  return { customer, operator, rfq, quote, viewer };
}

describe('booking integrity (test database)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/server/db/client'));
    quotes = await import('@/server/services/quotes');
    bookings = await import('@/server/services/bookings');
    ({ permissionsFor } = await import('@/server/auth/permissions'));
    if ((await prisma.airport.count({ where: { iata: { in: ['BOM', 'DEL'] } } })) < 2) {
      const { importAirports } = await import('@/server/reference/airports');
      await importAirports();
    }
  }, 300_000);

  it('allows exactly one of two concurrent acceptances', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([quotes.acceptQuote(f.viewer, f.quote.id, 1), quotes.acceptQuote(f.viewer, f.quote.id, 1)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await prisma.booking.count({ where: { rfqId: f.rfq.id } })).toBe(1);
    const b = await prisma.booking.findUniqueOrThrow({ where: { rfqId: f.rfq.id } });
    expect(b.status).toBe('PENDING_OPERATOR_CONFIRMATION');
    expect(b.customerTotal.toString()).toBe('108000');
  });

  it('refuses expired quotes and stale revisions', async () => {
    const expired = await fixture({ validMinutes: -5 });
    await expect(quotes.acceptQuote(expired.viewer, expired.quote.id, 1)).rejects.toThrow(/expired/i);
    const stale = await fixture();
    await expect(quotes.acceptQuote(stale.viewer, stale.quote.id, 2)).rejects.toThrow(/updated by the operator/i);
    expect(await prisma.booking.count({ where: { rfqId: { in: [expired.rfq.id, stale.rfq.id] } } })).toBe(0);
  });

  it('refuses acceptance by anyone but the requesting customer', async () => {
    const f = await fixture();
    const other = await fixture();
    await expect(quotes.acceptQuote(other.viewer, f.quote.id, 1)).rejects.toThrow(/not found/i);
  });

  it('never lets a non-payment actor mark a booking paid, and requires the exact amount', async () => {
    const f = await fixture();
    const booking = await quotes.acceptQuote(f.viewer, f.quote.id, 1);
    // Customer without payment permission cannot record settlement.
    await expect(bookings.recordOfflineSettlement(f.viewer, booking.reference, { amount: '108000.00', providerRef: 'UTR1', evidenceNote: 'bank statement match' })).rejects.toThrow(/not allowed/i);
    const staff = { ...f.viewer, permissions: permissionsFor(['OPERATIONS']) } as typeof f.viewer;
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } });
    await expect(bookings.recordOfflineSettlement(staff, booking.reference, { amount: '100000.00', providerRef: 'UTR2', evidenceNote: 'bank statement match' })).rejects.toThrow(/must equal/i);
    await bookings.recordOfflineSettlement(staff, booking.reference, { amount: '108000.00', providerRef: `UTR-${tag}`, evidenceNote: 'bank statement match' });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('PAID');
  });
});
