# The Private — deployment

## 1. Neon
Use the Neon **pooled** connection as `DATABASE_URL` for runtime. Use the Neon **direct/non-pooled** connection as `DIRECT_URL` for Prisma CLI/migrations. Prisma recommends this pooled-runtime/direct-CLI split for Neon. If you only have the pooled URL right now, you can temporarily use it for both, but obtain the direct URL before production migrations.

## 2. Auth secret
Run:

`node scripts_generate_secret.mjs`

Put the output in `AUTH_SECRET`.

## 3. Database

`npm install`
`npx prisma db push`
`npm run db:seed`

Create an admin:

`ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-password' npm run db:admin`

For PowerShell use `$env:ADMIN_EMAIL='you@example.com'` etc.

## 4. Aircraft tracking
For development, OpenSky can be used as an integration source. The application supports authenticated OAuth2 credentials and anonymous access. OpenSky's current documentation describes `/states/all`, aircraft-filtered state vectors, flights and tracks. OpenSky states that its live API is for research/non-commercial purposes unless separately licensed, so do not use it as commercial production inventory data without the required permission.

First enrich registrations to ICAO24:

`npm run db:enrich-icao`

Then the cron endpoint can collect positions:

`GET /api/aviation/sync`

The Vercel cron configuration calls this every 10 minutes and the empty-leg checker every 15 minutes.

## 5. Stripe
Leave blank until ready. When enabled, add:

`STRIPE_SECRET_KEY`
`STRIPE_WEBHOOK_SECRET`

Then configure the Stripe webhook to:

`https://YOUR-DOMAIN/api/webhooks/stripe`

## 6. Domain
Set:

`APP_URL=https://theprivate.in`

and the same production URL in your hosting provider.

## 7. Security
Never commit `.env`. Rotate any database credential that has been exposed publicly. Use a new Neon password before production.
