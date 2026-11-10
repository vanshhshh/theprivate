/**
 * Types shared by the import pipeline. The ImportPlan is a pure, serialisable description of
 * the desired state derived from source files; it contains no database identifiers.
 */

import type { AircraftCategory } from '../aircraft/type-catalog';
import type { AirframeClass, OperatingScope } from './normalize';

export type CountryCode = 'IN' | 'AE';

/** Field groups let one source be authoritative for contacts but secondary for profile text. */
export type FieldGroup = 'regulatory' | 'profile' | 'contact' | 'research';

export interface SourceDescriptor {
  code: string;
  fileName: string;
  country: CountryCode;
  kind: 'XLSX' | 'PDF';
  role: 'PRIMARY' | 'ENRICHMENT_LAYER' | 'CONTACT_LAYER' | 'HISTORICAL' | 'AUTHORITY_REGISTRY';
  /** Higher wins. Per field group; missing group ⇒ source does not speak to that group. */
  trust: Partial<Record<FieldGroup, number>>;
  asOf: string | null;
  description: string;
}

export interface SourceRef {
  source: string; // SourceDescriptor.code
  sheet: string;
  row: number; // 1-based spreadsheet row (header = 1) or PDF line ordinal
}

export interface CellRow {
  ref: SourceRef;
  cells: Record<string, unknown>;
}

export interface LoadedSheet {
  name: string;
  header: string[];
  rows: CellRow[];
}

export interface LoadedSource {
  descriptor: SourceDescriptor;
  sha256: string;
  byteLength: number;
  sheets: LoadedSheet[];
}

export type Confidence = 'AUTHORITY' | 'VERIFIED_PUBLIC' | 'RESEARCH' | 'UNVERIFIED';

export interface Observation {
  field: string;
  value: string | number | boolean | null;
  ref: SourceRef;
  group: FieldGroup;
  confidence: Confidence;
}

export type EvidenceLevel =
  | 'AUTHORITY_REGISTRY' // listed on a regulator permit (DGCA NSOP list)
  | 'OPERATOR_PUBLISHED_CURRENT' // operator's own current website/fleet guide
  | 'FLIGHT_TRACKING_RECENT' // seen operating under the operator's callsign recently
  | 'PUBLIC_RECORD_UNCONFIRMED' // registration seen in a public listing/brochure; not confirmed current
  | 'MANAGED_NOT_CHARTER' // managed aircraft, not automatically charterable
  | 'NEEDS_OPERATOR_CONFIRMATION';

export interface PlannedAuthorization {
  authority: 'DGCA' | 'GCAA';
  certificateType: 'NSOP' | 'AOC';
  numberRaw: string | null;
  numberNormalized: string | null;
  numberStatus: 'VALID' | 'MALFORMED' | 'MISSING';
  validFrom: string | null;
  validUntil: string | null;
  validUntilRaw: string | null;
  scope: OperatingScope | null;
  scopeRaw: string | null;
  ref: SourceRef;
}

export interface PlannedContact {
  key: string; // stable per operator
  kind: 'REGULATORY' | 'COMPANY' | 'DECISION_MAKER' | 'CHARTER_SALES';
  name: string | null;
  title: string | null;
  emails: string[];
  phones: string[];
  unparsedPhones: string[];
  sourceUrl: string | null;
  note: string | null;
  confidence: Confidence;
  refs: SourceRef[];
}

export interface PlannedOperator {
  key: string; // ExternalIdentifier, e.g. "IN-NSOP-MASTER:17"
  country: CountryCode;
  legalName: string;
  displayName: string;
  aliases: string[];
  slugBase: string;
  website: string | null;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  address: string | null;
  baseDescription: string | null;
  /** ThePrivate research classification (A–D or Confirmed/…); never shown publicly as fact. */
  marketplaceRelevance: string | null;
  charterActivity: string | null;
  operatorKind: string | null;
  fleetClassesRaw: string | null;
  authorizations: PlannedAuthorization[];
  contacts: PlannedContact[];
  dataQualityFlags: string[];
  observations: Observation[];
  refs: SourceRef[];
}

export interface PlannedAircraftType {
  key: string;
  manufacturer: string;
  model: string;
  family: string;
  category: AircraftCategory;
  airframeClass: AirframeClass;
}

export interface PlannedAircraft {
  key: string; // "REG:VT-ABC"
  registration: string;
  operatorKey: string;
  modelRaw: string | null;
  typeKey: string | null;
  typeResolution: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' | 'CONFLICT';
  typeFamilyHint: string | null;
  airframeClass: AirframeClass | null;
  seats: number | null;
  seatsRaw: string | null;
  isCargo: boolean;
  isAerialWork: boolean;
  evidenceLevel: EvidenceLevel;
  sourceStatusRaw: string | null;
  usageRaw: string | null;
  sourceUrl: string | null;
  note: string | null;
  /** Attribution to the operator is uncertain (row came from a corrupted source record). */
  attributionUncertain: boolean;
  dataQualityFlags: string[];
  observations: Observation[];
  refs: SourceRef[];
}

/** Model-level evidence ("operator flies AW139s"): NEVER an Aircraft. */
export interface PlannedFleetEvidence {
  key: string;
  operatorKey: string;
  modelRaw: string;
  typeKey: string | null;
  typeResolution: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED';
  seats: number | null;
  reportedCount: number | null;
  usageRaw: string | null;
  evidenceLevel: EvidenceLevel | 'PUBLIC_MODEL_RECORD';
  sourceStatusRaw: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  note: string | null;
  refs: SourceRef[];
}

export interface PlannedRegistryEntry {
  key: string; // "GCAA:AT-0001"
  authority: 'GCAA';
  organizationName: string;
  approvalNumberRaw: string;
  approvalNumber: string | null;
  organizationType: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  country: string | null;
  linkedOperatorKey: string | null;
  ref: SourceRef;
}

export interface PlannedEvidenceSource {
  key: string;
  label: string;
  organization: string | null;
  sourceType: string | null;
  asOf: string | null;
  url: string | null;
  usage: string | null;
  ref: SourceRef;
}

export interface PlannedConflict {
  entityKey: string;
  entityType: 'OPERATOR' | 'AIRCRAFT' | 'CONTACT' | 'FLEET_EVIDENCE';
  field: string;
  values: { value: string | number | boolean | null; ref: SourceRef; trust: number }[];
  /** AUTO: higher-trust source chosen, kept for review. OPEN: cannot be decided automatically. */
  resolution: 'AUTO_HIGHER_TRUST' | 'OPEN';
  chosen: string | number | boolean | null;
  reason: string;
}

export interface PlannedMatchCandidate {
  entityType: 'OPERATOR';
  leftKey: string;
  rightKey: string;
  score: number;
  reasons: string[];
  recommendation: 'LIKELY_SAME' | 'POSSIBLY_SAME' | 'LIKELY_DISTINCT';
}

export interface RejectedRow {
  ref: SourceRef;
  reason: string;
}

export interface RepairNote {
  ref: SourceRef;
  field: string;
  from: string | null;
  to: string | null;
  reason: string;
}

export interface MetadataCheck {
  ref: SourceRef;
  claim: string;
  stated: string;
  computed: string;
  consistent: boolean;
}

export interface ImportPlan {
  version: 1;
  sources: { code: string; fileName: string; sha256: string; byteLength: number; role: string; sheets: { name: string; rows: number }[] }[];
  aircraftTypes: PlannedAircraftType[];
  operators: PlannedOperator[];
  aircraft: PlannedAircraft[];
  fleetEvidence: PlannedFleetEvidence[];
  registryEntries: PlannedRegistryEntry[];
  evidenceSources: PlannedEvidenceSource[];
  conflicts: PlannedConflict[];
  matchCandidates: PlannedMatchCandidate[];
  rejected: RejectedRow[];
  repairs: RepairNote[];
  metadataChecks: MetadataCheck[];
  unmatchedModels: { modelRaw: string; count: number }[];
  warnings: string[];
}
