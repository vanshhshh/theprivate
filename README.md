# ThePrivate

A private aviation marketplace: charter RFQs and quotations, empty legs, aircraft sales, an operator portal and an admin console. India first, built for international expansion.

**Status:** All phases are built and tested locally. The product has not been deployed. See `docs/IMPLEMENTATION_CHECKLIST.md`.

## Docs
- `docs/ARCHITECTURE.md`: system design, stack, schema, journeys, design and motion direction, risks
- `docs/DATA_AUDIT.md`: what was found in the source bundle and how the importer handles it
- `docs/IMPLEMENTATION_CHECKLIST.md`: progress tracker
- `docs/DEPLOYMENT.md`: production deployment, backups, rollback and monitoring
- `reports/import/latest-dry-run.md`: the approved import plan

## Setup

```bash
npm install                 # Node >= 22.12
cp .env.example .env        # then set BETTER_AUTH_SECRET
npm run db:start            # local PostgreSQL (UTF-8) on :54329; leave it running
npx prisma migrate deploy
npx prisma generate
```

## Run the app

```bash
npm run reference:airports             # once: load airports
npm run dev                            # http://localhost:3000
npm run worker                         # notifications and expiry sweeps (separate terminal)
npm run admin:grant -- you@x.com SUPER_ADMIN   # after signing up in the browser
```

## Data import

The source bundle lives in `ThePrivate_Aviation_Database_Bundle/` and is never modified.

```bash
npm run import:inspect                     # every source, sheet, header and row count
npm run import:dry-run                     # plan + report; no database access
npm run import:dry-run -- --against-db     # also computes the exact DB diff (rolled-back transaction)
npm run import:apply -- --approve <hash>   # writes the reviewed plan; refuses if the hash changed
```

Take a database backup (`pg_dump`) before `apply` in any shared environment.

## Tests

```bash
npm test          # unit and integration tests (integration uses the isolated *_test database; needs db:start)
npm run typecheck
npm run build && npm run test:e2e   # Playwright, production build, *_test database
```
