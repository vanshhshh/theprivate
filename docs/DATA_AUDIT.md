# Data audit: ThePrivate Aviation Database Bundle

Audited 2026-11-04. Every workbook, every sheet and the PDF were inspected before any import code was written. The source files are read-only to the importer, and they are re-hashed after every run to prove they were not changed.

The live figures are in `reports/import/latest-dry-run.md`. This document explains *why* the importer behaves as it does.

## 1. India: seven workbooks, one operator universe

| Finding | Evidence | Importer behaviour |
|---|---|---|
| All 7 workbooks describe the same 138 DGCA NSOP rows | Identical `operator_master_id` sets (1–138) in every operator sheet | Treated as **layers**. One operator per master id. Never added as separate universes. |
| The `Aircraft` sheet (491 rows) is byte-identical in all 7 files | Cell-by-cell comparison | Imported once, from Final. The importer re-verifies identity on every run and warns if a layer diverges. |
| 31 aircraft rows are repeated PDF table headers | `registration = "AIRCRAFT REGISTRATION"` | Rejected, with the reason recorded. **460 real airframes** remain, all with unique VT- registrations. |
| Layers differ only in enrichment columns | Field-level diff | Field-group trust: Final > CRM / Contacts > Deep > Web > Enriched > May. |
| The CRM refines decision-maker data (26 values Final lacks; "Sunil (public charter contact)" split into name and title) | Diff | For contact fields the CRM outranks Final. Every other value is preserved as an observation or an auto-resolved conflict. |
| No older layer holds a value that Final dropped (outside contact fields) | Diff | Nothing is lost. A blank in a stronger layer never erases a value from a weaker one. |
| **10 DGCA rows are interleavings of two PDF rows** | May-2026 names such as "AGleorboakla Vliencgtar…" ("Global Vectra" zipped with "Aerokalinga"); permits like `## 1078//21092958`; dates like `1258..1004..22003280`; counts like `227` (really 27) | Permit number, validity and scope are stored as **MALFORMED**, raw value kept. The operator is flagged `SOURCE_ROW_INTERLEAVED`. **93 aircraft** listed under these rows are flagged `OPERATOR_ATTRIBUTION_UNCERTAIN`. |
| The researchers later corrected those rows' names, which created same-name duplicates (Global Vectra, MSPL ×3, Pawan Hans, Span Air and others) | `source_data_quality` column | **12 identity candidates**, recommended LIKELY_SAME but **not merged**. An admin confirms each one. |
| MSPL rows 78 and 81 share permit 02/2009 but have different validity and scope | Final | Candidate with the reason "validity differs"; needs a check against DGCA. |
| Kairamya (61) and Smart Wings (115) share permit **19/2025** | Final | Flagged as a **permit-number collision**: one record is wrong. Verify against DGCA. |
| Khazana and Kingscraft share DGCA listed no. 67 | README notes the numbering anomaly | Distinct companies; not treated as duplicates. |
| The DGCA dashboard reports 137 NSOPs; the PDF extraction has 138 rows | May README | Reported as an inconsistent metadata claim; every row is kept. |
| Some seat values merge two cells ("1 6", "2 6") | Aircraft sheet | Seats left empty and flagged `SEATS_AMBIGUOUS`. Never guessed. |
| "6/Aerial Work", "Cargo" | Aircraft sheet | Seats split from usage flags (`isAerialWork`, `isCargo`). |
| `linkedin` often holds a label ("Afcom Holdings Ltd (LinkedIn)"), not a URL | Final | Not stored as a URL. The text is kept as an observation. |
| Narrative research sheets (Final Web Pass, Deep, Latest) are keyed by operator *name* | — | Linked by normalised name only when exactly one operator matches. Otherwise kept as a source record and listed as a warning. |
| Coverage and summary sheets make numeric claims | Contact Coverage, Outreach Coverage | Recomputed from the rows. All match. |

## 2. UAE: three workbooks and the GCAA PDF

| Finding | Importer behaviour |
|---|---|
| Aircraft_Verified (76 rows) is the newest pass. Full (71) is its prefix minus 5 Royal Jet rows. Operator_Enrichment (50) is the oldest. | Verified is primary. Older layers are aligned by registration, then by resolved type, and kept as observations. |
| **5 rows have `Verification Status` and `Verification Note` swapped** (A6-RJV, A6-DAS, A6-AIN, A6-RJZ, A6-RJD) | Deterministically swapped back and listed under Repairs. |
| The Verification_Summary says 27 CURRENT_PUBLIC; the data has 32 after repair | Reported as an inconsistent metadata claim. The summary was produced before the 5 rows were added. |
| **A6-RJC**: type says "Boeing Business Jet", note says "listed under Bombardier Global" | **OPEN conflict.** The type is left unset. |
| 42 rows have no registration (model-level, "100+ managed fleet", "Global 5000/6000" etc.) | Stored as `FleetEvidence`. **Never converted into aircraft.** |
| MANAGED_NOT_AUTO_CHARTER (ExecuJet, Avcon) | Evidence level MANAGED_NOT_CHARTER. Not inventory. |
| "Boeing Business Jet" without a variant | Type marked AMBIGUOUS; the variant is not guessed. |
| Oldest layer contains `[email protected]` (Cloudflare obfuscation) | Discarded and recorded as a repair. Never stored as an address. |
| Older layers carry extra phone numbers (e.g. the ADA charter line) | Kept as a separate contact flagged UNVERIFIED, not mixed into the verified contact. |
| A6-MVD seats are 12 in Verified and 10 in the oldest layer | Auto-resolved to Verified; both values preserved. |
| 3 legacy rows were dropped by the verification pass (DC Aviation G650 and PC-12; ExecuJet "fleet not enumerated") | Not imported; listed as warnings. |
| The GCAA PDF has 34 organisations; positional extraction reads every row cleanly (`pdftotext -layout` mis-staggers page 2, so it is not used) | All 34 stored as `AuthorityRegistryEntry`. The 11 ThePrivate operators are linked by **approval number** (`UAE-AOC-AT-0066` ≡ `AT-0066`). The other 23 are registry-only and are **not** made into operators. |
| India "Falcon Aviation Services Pvt. Ltd." and UAE "Falcon Aviation Services" have identical names | Candidate marked LIKELY_DISTINCT: different countries and regulators. |

## 3. What the import will never do

These guarantees are enforced in code and asserted in `tests/integration/import-apply.test.ts`:

- Change an operator's lifecycle beyond DISCOVERED, or list an operator publicly.
- Mark an aircraft charter-eligible or approved, or create availability, prices, empty legs or sale listings.
- Overwrite data owned by an operator or admin. Protected cases are operators past DISCOVERED, aircraft past IMPORTED_UNREVIEWED, admin-verified authorisations, and resolved conflicts or reviewed matches. These are counted as "protected", not written.
- Merge operator identities.
- Store a guessed value. Ambiguous types, seats and permit numbers stay empty, with the raw value kept.

## 4. Personal data

The CRM sources include names, titles, phone numbers and e-mail addresses of real people (decision-makers). They are imported into `OperatorContact`, which is restricted to staff with the `operator.contacts.read` permission. They are never rendered on public routes and never sent to any external service.
