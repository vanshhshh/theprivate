# The Private — production-oriented MVP

Minimal customer + operator private aviation marketplace.

## Included
- PostgreSQL + Prisma 7 schema
- 138 preloaded operators / aircraft seed data
- Customer and operator authentication
- Secure claim-token flow with admin approval
- Operator fleet verification
- Operator pricing rules + internal buffer
- Instant indicative charter pricing
- Availability + empty-leg listings
- RFQ / quote workflow
- Booking state machine
- Stripe Checkout integration (disabled until keys are added)
- In-app notifications
- OpenSky live-position integration hook
- Cron endpoints for aviation sync and empty-leg checks
- Admin operator approval UI

## Local setup
1. Copy `.env.example` to `.env`.
2. Add your Neon pooled URL to `DATABASE_URL`.
3. Add Neon direct URL to `DIRECT_URL` for Prisma CLI/migrations. Prisma recommends pooled runtime + direct CLI for Neon. See Prisma docs.
4. Generate `AUTH_SECRET` with `node scripts_generate_secret.mjs`.
5. `npm install`
6. `npx prisma db push`
7. `npm run db:seed`
8. Create an admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:admin`
9. `npm run dev`

## Production
Set `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `CRON_SECRET` in your hosting environment.
Stripe is optional until payments are enabled.
OpenSky is optional; add `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` for authenticated API access. The OpenSky API is for research/non-commercial use unless separately licensed, so do not use it as commercial production data without the appropriate permission.

## Important
DGCA-derived operator/aircraft information is preloaded for discovery and verification. It is not a guarantee of current aircraft availability. Only operator-confirmed inventory should be treated as bookable.
