# Deployment

ThePrivate is one Next.js application, one background worker process and one PostgreSQL database. Nothing has been deployed. The steps below need production credentials and your approval.

## 1. Infrastructure

| Component | Recommendation | Notes |
|---|---|---|
| Web app | Any Node 22+ host: Vercel, Fly.io, Render, AWS ECS or a VM | `npm run build`, then `npm start`. Stateless; scale horizontally. |
| Worker | Same image, command `npm run worker` | One or more instances; jobs are claimed with `FOR UPDATE SKIP LOCKED`. On serverless hosts, run `npm run worker -- --once` from a cron every minute instead. |
| Database | Managed PostgreSQL 16+ (Neon, Supabase, RDS, Cloud SQL) | Requires the `pg_trgm` extension (created by migration). Enable point-in-time recovery. |
| Files | S3-compatible bucket (S3, R2, GCS) | Set `STORAGE_DRIVER=s3`. The S3 driver is a defined boundary in `src/server/storage.ts` and must be implemented with the chosen SDK before going live; local disk is not suitable for multi-instance hosting. |
| E-mail | Resend (implemented) or another provider | Without credentials, deliveries are recorded as `SKIPPED_NOT_CONFIGURED`. |

## 2. Environment variables

Copy `.env.example`. These are required in production:

- `DATABASE_URL`: production PostgreSQL, with SSL.
- `BETTER_AUTH_SECRET`: 32+ random bytes. Rotating it invalidates all sessions.
- `BETTER_AUTH_URL`: the public origin, e.g. `https://theprivate.example`. It must match exactly, because the auth origin checks use it.
- `NODE_ENV=production`: enables secure cookies and HSTS.

These are optional, and each feature degrades honestly without them:

- `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM`
- `STORAGE_DRIVER`, `S3_*`
- `SENTRY_DSN`: wire the reporter into `captureException` in `src/server/log.ts`
- `LOG_LEVEL`

Never set `AUTH_RATE_LIMIT=off` in production. It exists only for the test harness.

## 3. First deployment

```bash
npm ci
npx prisma migrate deploy           # applies prisma/migrations in order (no data loss)
npx prisma generate
npm run build
npm run reference:airports          # loads ~6,000 airports (idempotent)
npm run import:dry-run -- --against-db
# review reports/import/latest-dry-run.md, then:
npm run import:apply -- --approve <planHash>
npm start                           # web
npm run worker                      # separate process
```

Then sign up the first staff account in the browser and grant it the super admin role:

```bash
npm run admin:grant -- you@company.com SUPER_ADMIN
```

From then on, roles are managed in Admin → Users & roles.

## 4. Commercial configuration before launch

In Admin → Settings:

- **`tax.charterBps`**: per-country tax rates, set on your tax adviser's advice. Until then, quotes show "excl. taxes".
- **`payments.mode`**: leave as `pre-payment` until a payment provider has commercial and legal approval. In pre-payment mode, staff record verified offline settlements with a bank or UTR reference.

Payment provider webhooks (`/api/webhooks/payments/[provider]`) return 501 until a provider is integrated. Signature verification must be implemented at that point.

## 5. Backups and recovery

- Enable your provider's automated daily snapshots and point-in-time recovery (7–30 days).
- Before every migration or data import, take a manual snapshot:

  ```bash
  pg_dump --format=custom "$DATABASE_URL" > backup-$(date +%F).dump
  ```

- Restore with:

  ```bash
  pg_restore --clean --no-owner -d "$DATABASE_URL" backup.dump
  ```

- Back up object storage with bucket versioning.

## 6. Rollback

- **Application:** redeploy the previous image or build. Migrations are additive in this release; if a future migration is destructive, ship it in two steps (expand, then contract).
- **Data import:**
  - Every apply runs in a single transaction, so a failed import leaves nothing behind.
  - For a completed import, `ImportChange` records each created or updated entity with before and after values, and `SourceRecord` keeps every raw row.
  - Restore from the pre-import snapshot. A selective rollback command is listed under remaining work.

## 7. Monitoring

- Logs are structured JSON (pino) on stdout, with sensitive keys redacted. Ship them to your log platform.
- Alert on:
  - HTTP 5xx rates;
  - `Job` rows with `status = 'DEAD'`;
  - `NotificationDelivery.status = 'FAILED'`;
  - worker heartbeat (no `SUCCEEDED` jobs in 10 minutes while jobs are pending).
- Business health checks, live in Admin → Overview: unmatched requests, bookings awaiting confirmation, open data conflicts.

## 8. Security checklist

- HTTPS only. HSTS, CSP, frame-deny and `nosniff` are already set in `next.config.ts`.
- Database user with least privilege. Restrict network access to the app and worker.
- Rotate `BETTER_AUTH_SECRET` and provider keys through your secret manager.
- Have counsel review the legal pages (marked as drafts) before launch.
- Run `npm audit` and keep Next.js, Prisma and Better Auth on patched versions.
