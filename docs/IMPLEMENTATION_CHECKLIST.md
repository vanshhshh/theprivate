# Implementation checklist

Legend: `[x]` done and verified · `[~]` partial · `[ ]` not done. Updated 2026-11-04.

## Phase 1: Discovery and architecture
- [x] Environment, source data audit, architecture (`docs/ARCHITECTURE.md`, `docs/DATA_AUDIT.md`)
- [x] Owner approval (2026-11-04)

## Phase 2: Foundation
- [x] Next.js 16 / React 19 / TypeScript 6 strict; Tailwind 4; Prisma 7 + PostgreSQL; 5 migrations, no drift
- [x] Better Auth (e-mail/password, DB sessions, rate limiting, secure cookies in production)
- [x] RBAC: six staff roles with narrow permission sets; operator membership roles; server-side guards on every page and action
- [x] Error model (`AppError`, `runAction`), structured logging with redaction, monitoring hook
- [x] Storage with magic-byte sniffing, size limits and an authorised file route
- [x] Job outbox + worker (`FOR UPDATE SKIP LOCKED`), expiry sweeps, messaging boundary
- [x] Security headers (CSP, HSTS in production, frame-deny, nosniff, permissions policy)

## Phase 3: Design foundation
- [x] "Sectional" design tokens, type system (Newsreader / Instrument Sans / IBM Plex Mono), status vocabulary
- [x] Primitives: buttons, server-action forms (pending, field errors, no reset on error), tables, empty states, pills
- [x] Motion: great-circle route arc, flap digits, scroll-driven reveals and parallax (compositor-only), page entrances; reduced-motion respected
- [x] Responsive layouts verified on Pixel 7 viewport (no horizontal overflow on 8 key pages)

## Phase 4: Core marketplace
- [x] 6,057 airports (OurAirports + IANA timezones), trigram search with correct ranking
- [x] Public site: home, charter, results, empty legs, aircraft for sale, operators, about, contact, for operators, legal drafts, 404, robots, sitemap, JSON-LD
- [x] Charter search over verified supply only, with labelled availability, range and indicative-price signals
- [x] RFQ (one-way, return, multi-leg), automatic routing, ops-desk alert when unmatched
- [x] Quotes and revisions with server-side pricing; customer comparison; acceptance with row lock + unique constraints
- [x] Booking lifecycle; PAID only via verified settlement
- [x] Customer account: overview, trips, booking detail, inbox, settings, my listings

## Phase 5: Operator platform
- [x] Claim existing profile / request new profile; claim grants nothing until approved
- [x] Verification documents, submit for review, staff review; agreement issue + click-through signature; activation
- [x] Fleet: confirm imported aircraft, add aircraft, edit (material changes return to review), photos, operational status
- [x] Availability windows (home-base timezone, 14-day freshness), confidential hourly rates
- [x] Requests inbox, quote / revise / withdraw / decline; bookings confirm / cancel / progress; team members

## Phase 6: Empty legs
- [x] Published only by active operators for approved aircraft; auto-expiry; public discovery and enquiries; staff withdrawal

## Phase 7: Aircraft sales
- [x] Seller submission with photos and private documents; sales-desk review (publish / needs info / reject / sold / unpublish)
- [x] Public marketplace with filters and sorting; buyer enquiries routed through the desk; seller-lead tracking; seller contact never public

## Phase 8: Administration
- [x] Overview (live counts), operators (filters, lifecycle, certificates, documents, agreements, directory listing, private contacts with throttled access audit)
- [x] Claims, aircraft review with field provenance, requests with manual routing, bookings with settlement, empty legs, sales, messages
- [x] Data: import batches, sources, GCAA registry, conflict review, identity matches with merge tool, aircraft type specs (citation required)
- [x] Users and roles, audit log, settings (tax, payments mode, validity, integration status)

## Phase 9: Data ingestion
- [x] Dry-run → owner approval → apply (batch `cmw2a20j…`, plan `e458e78e…`), idempotent, provenance-preserving
- [x] Admin merge tool for confirmed identity matches
- [ ] Selective rollback command for a single batch (data recorded in `ImportChange`; snapshot restore documented)

## Phase 10: Quality
- [x] Unit tests (lifecycles, pricing, permissions, eligibility, normalisation, reconciliation, the real import plan)
- [x] Integration tests on real PostgreSQL (import idempotency and protection; concurrent acceptance; expiry; settlement rules)
- [x] E2E in Chromium against a production build: 15 journeys + 9 mobile checks
- [x] Bugs found and fixed through testing: airport ranking (NULL ordering), duplicate form ids (accessibility), React auto-reset erasing input on validation errors, redirecting prefetch remounting forms, JSON key-order idempotency, WIN1252 database encoding

## Phase 11: Deployment readiness
- [x] `docs/DEPLOYMENT.md`: infrastructure, environment, first deploy, backups, rollback, monitoring, security checklist
- [ ] Production deployment (requires your infrastructure and approval)

## Last verified run (2026-11-04)
- `next build`: succeeded
- Vitest: 61 / 61 passed
- Playwright: 24 / 24 passed (desktop + mobile)
- `npm audit`: 0 vulnerabilities
