# ThePrivate — Architecture

Status: **Approved by the owner 2026-11-04 and implemented.** See `IMPLEMENTATION_CHECKLIST.md` for verified status.

---

## 1. What ThePrivate is

ThePrivate is a two-sided private aviation marketplace. It starts in India and is built to expand internationally.

- **Demand side.** Customers request charter flights, compare operator quotations and book. They can also browse genuine empty legs and aircraft for sale.
- **Supply side.** Operators and aircraft managers claim their profile, get verified, sign an agreement, manage fleet, availability and pricing, and answer requests.
- **Platform.** Administrators run verification, data quality, commercial agreements, listings and the booking lifecycle.

The marketplace only earns trust if it never overstates what it knows. Three kinds of record are kept strictly apart in every layer, from the schema to the UI:

| Kind | Example | Can a customer act on it? |
|---|---|---|
| **Known, unverified** | DGCA lists VT-ABC on an operator's NSOP permit | No. Shown as "listed by regulator" at most. |
| **Verified** | Operator claimed the profile, documents checked, aircraft approved | Visible; quote-requestable only once the operator is ACTIVE. |
| **Available inventory** | Operator-declared availability window or a published empty leg, not expired | Yes. |

There is no path from "imported" to "bookable" that skips a human verification step and an operator action.

---

## 2. System architecture

One deployable Next.js application (a modular monolith), one PostgreSQL database, and one background worker process that uses the same codebase. No microservices: the domain is cohesive, the team is small, and transactional integrity (quote acceptance, booking) is far easier inside one database.

```
           ┌──────────────────── Next.js 16 (App Router, RSC) ─────────────────────┐
 Browser ──►  app/(public)  app/(account)  app/operator  app/admin   app/api/*      │
           │        │ server components / server actions / route handlers         │
           │        ▼                                                              │
           │  src/server/services/*   ← application services (use cases)          │
           │        │       │                                                      │
           │        │       └─► src/server/auth (session + RBAC policy checks)     │
           │        ▼                                                              │
           │  src/domain/*  ← pure business rules: lifecycles, pricing, matching,  │
           │                  eligibility, reconciliation (no I/O, fully unit-tested)
           │        ▼                                                              │
           │  src/server/db (Prisma 7 + pg adapter) ─────────► PostgreSQL 17/18    │
           │  src/server/integrations/* (payments, email, SMS, WhatsApp, storage)  │
           └──────────────────────────────────────────────────────────────────────┘
                        ▲
 scripts/worker.ts ─────┘  polls the `Job` table (transactional outbox) for
                           notifications, quote expiry, empty-leg expiry, imports
```

**Boundaries and rules**

- **UI components** never import Prisma. Pages call services; services call domain functions and repositories.
- **Domain modules** (`src/domain`) are pure TypeScript: state machines, price computation, matching and reconciliation. They are the most heavily tested code.
- **Every mutation** goes through a service that:
  1. authenticates;
  2. authorizes with a policy check;
  3. validates input with Zod on the server, even when the client has also validated;
  4. runs in a transaction where integrity matters;
  5. writes an `AuditEvent` for sensitive actions;
  6. enqueues side effects (notifications) into the `Job` outbox inside the same transaction.
- **Integrations** sit behind interfaces. Each provider has a `NotConfigured` implementation that records the delivery as `SKIPPED_NOT_CONFIGURED`. It never pretends a message or payment went through.
- **Background processing** uses a Postgres-backed job table (`SELECT … FOR UPDATE SKIP LOCKED`). This needs no Redis and stays transactionally consistent with the data it reacts to.

---

## 3. Technology stack

Versions were checked against the npm registry on 2026-11-04. `npm audit` reports 0 vulnerabilities.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.4.5**, React 19.3 | Server Components keep pricing logic and data access on the server by default. Server Actions give typed mutations. Mature image optimisation, metadata API and route handlers. |
| Language | **TypeScript 6.0.3**, strict | TS 7 (the native compiler) is out but too new for Next's build-time type checks. 6.0 is the last JS-based release and fully compatible. |
| Database | **PostgreSQL** (17/18) | Relational integrity, partial and unique indexes, `SKIP LOCKED` queues, `timestamptz`, `numeric` money, trigram search for airports and operators. |
| ORM | **Prisma 7.10.1** + `@prisma/adapter-pg` | Typed client and migration history. Pinned to stable 7.10.1: npm's `latest` tag currently points at an 8.0 release candidate. |
| Auth | **Better Auth 1.7** (Prisma adapter) | Database sessions, email/password with modern hashing, built-in rate limiting and CSRF protection. Authorization (RBAC) is our own code, not delegated. |
| Validation | **Zod 4** | One schema for form, server action and API. |
| Styling | **Tailwind CSS 4** + CSS custom-property tokens | Tokens live in CSS. Tailwind is the delivery mechanism, not the design. |
| Motion | **Motion 14** (formerly Framer Motion), CSS scroll-driven animations, View Transitions API | See §7. Canvas/WebGL only for the route visualisation, lazy-loaded. |
| Logging | **pino** (JSON) | Structured logs with request IDs. The error-monitoring adapter (Sentry-compatible) is a no-op until a DSN is configured. |
| Testing | **Vitest 5** (unit + integration against a real Postgres), **Playwright 1.64** (E2E in Chromium/WebKit, mobile viewports) | |
| XLSX import | **read-excel-file 9** (read-only parser) | Small, maintained, read-only, so it cannot modify source files. ExcelJS was rejected because of stale transitive dependencies. |
| PDF import | **pdfjs-dist 6** | Positional text extraction for the GCAA list. |
| Local database | **embedded-postgres** (dev/test only) | Postgres and Docker are not installed on this machine. This ships real PostgreSQL binaries inside `node_modules`, so development and tests run against real Postgres, not SQLite. |
| File storage | `StorageProvider` interface: local disk in dev, S3-compatible (S3 / R2 / GCS) in production | Uploads are private by default and served through signed, authorized routes. |

---

## 4. Database architecture

The full schema is in `prisma/schema.prisma`. The entity groups are:

**Geography:** `Country`, `Region`, `Airport` (IATA / ICAO, coordinates, IANA timezone, elevation, longest runway, source).

**Identity and access**
- `User`, `Session`, `Account`, `Verification` (Better Auth tables).
- `CustomerProfile`.
- `StaffRoleAssignment`: admin roles, scoped. Each admin role carries a limited set of permissions; super admin is the only exception.
- `OperatorMembership`: a user's role inside one operator (OWNER / MANAGER / DISPATCHER / VIEWER).

Permissions are defined in code (`src/server/auth/permissions.ts`) and mapped to roles. This makes them reviewable in pull requests and testable. Role assignments live in the database and are audited.

**Operators**
- `Operator`, with `lifecycleStatus` (see §4.1).
- `OperatorAlias`.
- `OperatorAuthorization`: regulator certificate (DGCA NSOP, GCAA AOC), with number (raw and normalised), validity, scope and parse status.
- `OperatorContact`: private CRM data; never rendered on public routes.
- `OperatorClaim`, `VerificationCheck`, `Agreement`.
- `Document`: private object storage reference with SHA-256, MIME type sniffed server-side and size.

**Aircraft**
- `AircraftType`: manufacturer, model, category and reference specs, each with a source. Specs are never invented; empty fields stay empty.
- `Aircraft`: an individual airframe identified by registration. It carries `evidenceLevel`, `reviewStatus`, `operationalStatus` and `charterEligible`.
- `FleetEvidence`: model-level claims such as "operator X flies AW139s" or "100+ managed aircraft". **Model-level evidence is never stored as an `Aircraft`.**
- `AircraftImage`, `AircraftAvailability`: operator-declared windows that expire.
- `PricingRule`: operator base rates. **Confidential**; read only by that operator and by permitted admins.

**Charter**
- `Rfq`, `RfqLeg`, `RfqRecipient`.
- `Quote`, `QuoteRevision`: operator price and customer price are stored separately; only the customer price ever leaves the server toward customers.
- `Booking`, `BookingLeg`, `BookingEvent` (append-only), `Payment` (provider boundary).

**Empty legs:** `EmptyLegListing`, `EmptyLegEnquiry`.

**Aircraft sales:** `SaleListing`, `SaleListingMedia`, `SellerLead`, `BuyerEnquiry`, `ListingReviewEvent`.

**Notifications:** `Notification` (in-app), `NotificationDelivery` (one row per channel attempt, with honest status), `Job` (outbox/queue).

**Data provenance**
- `DataSource`: one row per source file, with SHA-256, authority and trust rank.
- `ImportBatch`: dry run or apply, plan hash, summary, initiator.
- `SourceRecord`: one row per source row, keyed `(dataSourceId, sheet, rowKey)`, with content hash and raw JSON.
- `FieldObservation`: what each source said about each field of each entity.
- `ExternalIdentifier`: natural keys such as `IN-NSOP-MASTER:17`, `UAE-TP:UAE-03`, `REG:VT-ABC`.
- `DataConflict`, `MatchCandidate`: ambiguous identities awaiting review.
- `AuthorityRegistryEntry`: regulator list rows that are not, by themselves, operators.

**Audit and settings:** `AuditEvent` (append-only), `SystemSetting`.

**Conventions**
- `cuid` primary keys.
- `timestamptz` for every instant.
- Local departure dates and times are stored as a local date and wall-clock time next to the airport's IANA zone, plus a computed UTC instant.
- Money is `Decimal(14,2)` paired with an ISO-4217 `currency`. Floats are never used for money.
- `deletedAt` soft delete on user-facing business entities.
- Every lifecycle field is an explicit enum.

### 4.1 Lifecycles (enforced in `src/domain/*/lifecycle.ts`)

**Operator:** `DISCOVERED → CLAIMED → IN_REVIEW → VERIFIED → AGREEMENT_SIGNED → ACTIVE`, plus `SUSPENDED`, `REJECTED` and `EXCLUDED` (for example, Airports Authority of India is not a charter supplier).

- A claim grants **no** operator permissions until an admin approves the membership.
- Verified does not mean commercially active.
- Only ACTIVE operators receive RFQs, and only their approved aircraft can be quoted.

**Aircraft review:** `IMPORTED_UNREVIEWED | DRAFT → SUBMITTED → IN_REVIEW → APPROVED | REJECTED`.

An aircraft is *quotable* only when all of the following are true:
- the operator is ACTIVE;
- the aircraft review status is APPROVED;
- `charterEligible` is set;
- `operationalStatus` is ACTIVE;
- it is an individual airframe.

**RFQ:** `SUBMITTED → MATCHING → AWAITING_QUOTES → QUOTES_AVAILABLE → ACCEPTED → BOOKED | EXPIRED | CANCELLED`.

**Quote:** `SUBMITTED ⇄ REVISED → ACCEPTED | DECLINED | WITHDRAWN | EXPIRED | SUPERSEDED`.

**Booking:** `PENDING_OPERATOR_CONFIRMATION → CONFIRMED → (PAYMENT_PENDING → PAID) → COMPLETED`, or `CANCELLED`.
- `PAID` can only be set by a verified payment-provider webhook, never by a user action.
- In pre-payment mode a booking stops at `CONFIRMED` with payment handled offline. Admins record offline settlement with an evidence reference, and it is audited.

**Quote acceptance** runs in a single serializable transaction:
1. lock the RFQ row;
2. check the quote is SUBMITTED or REVISED, not expired, and that the RFQ has no accepted quote;
3. create the booking (`rfqId` and `quoteId` are both `@unique`).

That makes double acceptance impossible even under concurrency.

---

## 5. Major user journeys

1. **Customer charter.**
   - Search an airport pair, date(s) and passengers.
   - Results show verified operators/aircraft that could serve the route. Indicative prices are labelled as such; operator-declared availability is labelled as such.
   - Submit an RFQ.
   - Track status → compare quotes → accept → booking pending operator confirmation → confirmed → trip page.
2. **Empty legs.** Browse live, unexpired, published listings → enquire or request booking → the operator responds.
3. **Operator onboarding.**
   - Find own company in the directory → claim (work email, role, evidence).
   - Admin reviews → membership granted → status CLAIMED → submit documents → IN_REVIEW → VERIFIED → agreement → ACTIVE.
   - Operators not in the directory use "request a new profile".
4. **Operator daily work.** RFQ inbox → quote (choose an aircraft, price, validity) → revise → booking confirmation → availability and empty-leg publishing → fleet updates (which go through review).
5. **Aircraft sale.**
   - Seller submits → admin review (approve, reject or request info) → published.
   - Buyers enquire → admin routes the enquiry to the seller. Seller contact details are never shown publicly.
6. **Admin.** Verification queue, claim review, aircraft review, listing moderation, conflict and match review for imported data, booking oversight, user and role management, audit log.

---

## 6. Application structure

```
prisma/                 schema.prisma, migrations/, seed (reference data only, no fake supply)
src/
  app/
    (public)/           home, charter, empty-legs, aircraft-for-sale, operators, about, legal…
    (auth)/             sign-in, sign-up, reset
    account/            customer portal
    operator/           operator portal
    admin/              admin console
    api/                route handlers: auth, webhooks, file serving, search endpoints
  components/
    ui/                 design-system primitives (Button, Field, Dialog, DataTable…)
    motion/             motion primitives (Reveal, RouteArc, FlapDigits, PageTransition)
    domain/             composed components (AirportCombobox, QuoteCompare, FleetCard…)
  domain/               pure business logic, organised by bounded context
    operators/ aircraft/ charter/ pricing/ empty-legs/ sales/ imports/
  server/
    db/                 Prisma client and repositories
    auth/               session, permissions, policy guards
    services/           use cases (one file per aggregate)
    integrations/       payments/, messaging/, storage/, aviation-data/
    jobs/               job handlers
    log.ts, errors.ts
  lib/                  framework-agnostic utilities (money, time, ids)
scripts/                dev-db.ts, import.ts, worker.ts
tests/                  unit/, integration/, e2e/
docs/                   architecture, data audit, checklist, runbooks
```

---

## 7. Design and motion direction

**Concept: "Sectional."** The design draws on the visual language pilots actually use: aeronautical sectional charts, approach plates and paper flight strips, set with the restraint of a fine editorial print magazine. Private aviation sites usually reach for gold-on-black and stock photos of champagne. ThePrivate should feel *precise*: a product run by people who understand flying.

**Colour**
- **Chart Paper** `#F3F0E8`: warm off-white, the public surface.
- **Ink** `#111518`: text and the dark mode for the operator and admin consoles.
- **Sectional Blue** `#1F3B57`: structure and links.
- **Sector Magenta** `#A3245C`: the sole accent, used sparingly for primary actions and route lines. It is taken from the magenta of VFR charts.
- **Signals:** amber means *indicative*; green means *verified/available*; grey means *unconfirmed*.

The verification and availability vocabulary from §1 gets dedicated visual states, so honesty is legible at a glance.

**Type**
- **Newsreader**: editorial serif with optical sizes, for display.
- **Instrument Sans**: UI and body.
- **IBM Plex Mono**: anything a pilot would read off a strip, including ICAO/IATA codes, registrations, UTC times and coordinates.

The mono layer is a signature element, not decoration.

**Layout:** a strict 12-column grid with generous margins on public pages. Dense but calm tables in the consoles, laid out like flight strips: one row per record, with status at the left edge.

**Motion system**
- Easing tokens:
  - `--ease-climb: cubic-bezier(.22,1,.36,1)` for entrances;
  - `--ease-approach: cubic-bezier(.65,0,.35,1)` for state changes.
- Durations: 120, 220, 420 and 800 ms.

**Signature moments**
1. **Route arc.** As a user picks the departure and arrival airports, a great-circle arc draws between their real coordinates on a contour-line chart. It recomputes as the airports change, and it's the hero of the search.
2. **Flap digits.** Changing figures (quote totals, counts, times) roll like a departures board: short, monospaced, never more than 300 ms.
3. **Chart parallax.** Contour lines and graticule drift at different depths on scroll, using CSS scroll-driven animations (runs on the compositor; no JS scroll listeners).
4. **Page transitions.** The View Transitions API morphs shared elements. A search card becomes the RFQ header; a fleet card becomes the aircraft page.
5. **Stagger reveals.** Results enter in 40 ms staggers, capped at 8 items so long lists never feel slow.

**Restraint and performance**
- `prefers-reduced-motion` turns every move into an opacity change or none.
- Only transform and opacity are ever animated.
- The canvas route visualisation is lazy-loaded and paused off-screen.
- Performance is tested at 4× CPU throttle.

---

## 8. Data import architecture (summary)

Full findings are in `docs/DATA_AUDIT.md`.

The pipeline runs in three stages: **inspect → plan (dry run) → apply.**

1. **Source adapters** read each workbook and sheet, read-only. They produce typed `SourceRow`s with file SHA-256, sheet name and row number.
2. **Normalisers** clean registrations, authority numbers, phones, e-mails, seats and dates. Every repair is logged; nothing is silently dropped.
3. **Reconciler** (pure function) takes the source rows and the current database snapshot and produces an **ImportPlan**:
   - entity upserts keyed by natural identifiers;
   - field observations from every layer;
   - conflicts;
   - match candidates;
   - rejected rows, each with a reason.
4. **Dry run** writes the plan to `reports/import/` as Markdown and JSON, along with a deterministic **plan hash**.
5. **Apply** requires `--approve <planHash>`. It recomputes the plan, refuses if the hash differs, and executes the plan in one transaction. All writes are recorded against an `ImportBatch`.

Re-running produces zero changes, because every entity is keyed by an `ExternalIdentifier` and every source row by a content hash.

Imported operators enter as `DISCOVERED`, and imported aircraft as `IMPORTED_UNREVIEWED` with `charterEligible = false`. Nothing imported becomes public or bookable.

---

## 9. Risks and key decisions

| Risk | Mitigation |
|---|---|
| No real supply at launch, which makes empty states the norm | Empty states are designed as first-class screens, with an RFQ fallback. Results are never padded. |
| Corrupt rows from the DGCA PDF extraction (see the audit) | These go to a review queue, never auto-merged. Aircraft attribution for those rows is flagged as uncertain. |
| Personal data in the CRM sources (names, phone numbers, emails of real people) | Stored only in admin-restricted tables. Never rendered publicly. Access is audited. |
| Pricing leakage | Customer price is computed server-side. Operator payout and commission live in separate columns and DTOs; serializer tests assert they never reach customer payloads. |
| Double booking or acceptance races | Serializable transaction, row lock and unique constraints, covered by a concurrency integration test. |
| Payment honesty | `PAID` only via a verified webhook. Pre-payment mode is the default. |
| Timezones across India and the UAE | Local and UTC are stored together and always computed from the airport's IANA zone. |
| No Docker or Postgres on the dev machine | `embedded-postgres` for dev and test; managed Postgres in production. |

---

## 10. What will be needed from the owner (later)

1. **Production Postgres** (Neon, Supabase, RDS or similar) and a hosting target (Vercel, Fly or AWS).
2. **Email:** Resend, Postmark or SES API key, plus a verified sending domain.
3. **SMS and WhatsApp:** for example Twilio or Gupshup, plus DLT registration and templates for India.
4. **Payments:** Razorpay (India) and Stripe (UAE and international) keys, but only after commercial and legal approval. The platform runs in pre-payment mode until then.
5. **Object storage:** an S3, R2 or GCS bucket and credentials.
6. **Airport dataset licence decision.** The proposal is OurAirports, which is public domain.
7. **Commercial terms:** the default commission model and the operator agreement template.
8. **Legal:** terms, privacy policy (DPDP Act 2023 for India), and the operator agreement text. Drafted placeholders will be clearly marked as such.
9. **Approval of the import dry-run report** before any database write.
10. **Brand assets**, if any already exist (logo or wordmark). Otherwise a wordmark will be designed.
