import type { SourceDescriptor } from '@/domain/imports/types';

/**
 * Registry of the ThePrivate Aviation Database Bundle (prepared 2026-10-21).
 *
 * Trust ranks are per field group. India: Final_Web_Pass is the primary profile source
 * (per the bundle README); the Outreach CRM is the most refined source for contacts and
 * decision-makers; the May master is historical and only used for comparison/provenance.
 * UAE: Aircraft_Verified is the newest pass and supersedes Full_Enrichment, which supersedes
 * the original Operator_Enrichment. The GCAA PDF is authoritative for approval data only.
 */
export const SOURCES: SourceDescriptor[] = [
  {
    code: 'IN_FINAL_WEB_PASS',
    fileName: 'India_NSOP_Operator_Database_Final_Web_Pass_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'PRIMARY',
    trust: { regulatory: 100, profile: 100, contact: 80, research: 100 },
    asOf: '2026-08-16',
    description: 'Primary India operator source of truth (DGCA NSOP list 31 May 2026 + final web research pass).',
  },
  {
    code: 'IN_OUTREACH_CRM',
    fileName: 'India_NSOP_Operator_Outreach_CRM_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'CONTACT_LAYER',
    trust: { regulatory: 95, profile: 95, contact: 100, research: 90 },
    asOf: '2026-08-16',
    description: 'Outreach CRM: refined decision-maker names/titles/contacts and contact provenance.',
  },
  {
    code: 'IN_CONTACTS',
    fileName: 'India_NSOP_Operator_Contacts_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'CONTACT_LAYER',
    trust: { regulatory: 95, profile: 94, contact: 95, research: 89 },
    asOf: '2026-08-16',
    description: 'Contact normalisation layer (DGCA vs current phone/email, best contact).',
  },
  {
    code: 'IN_DEEP_ENRICHED',
    fileName: 'India_NSOP_Operator_Database_Deep_Enriched_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'ENRICHMENT_LAYER',
    trust: { regulatory: 90, profile: 80, contact: 70, research: 80 },
    asOf: '2026-08-16',
    description: 'Deep web research enrichment layer (superseded by Final Web Pass).',
  },
  {
    code: 'IN_WEB_ENRICHED',
    fileName: 'India_NSOP_Operator_Database_Web_Enriched_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'ENRICHMENT_LAYER',
    trust: { regulatory: 90, profile: 70, contact: 60, research: 70 },
    asOf: '2026-08-16',
    description: 'Web research enrichment layer (superseded by Deep and Final passes).',
  },
  {
    code: 'IN_ENRICHED',
    fileName: 'India_NSOP_Enriched_Operator_Database_Aug_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'ENRICHMENT_LAYER',
    trust: { regulatory: 90, profile: 60, contact: 50, research: 60 },
    asOf: '2026-08-16',
    description: 'First enrichment layer with research evidence register.',
  },
  {
    code: 'IN_MAY_MASTER',
    fileName: 'India_NSOP_Master_Database_May_2026.xlsx',
    country: 'IN',
    kind: 'XLSX',
    role: 'HISTORICAL',
    trust: { regulatory: 50, profile: 10, contact: 10, research: 10 },
    asOf: '2026-05-31',
    description: 'Raw DGCA extraction (May 2026). Historical comparison only; contains uncorrected extraction artifacts.',
  },
  {
    code: 'AE_AIRCRAFT_VERIFIED',
    fileName: 'UAE_ThePrivate_11_Aircraft_Verified.xlsx',
    country: 'AE',
    kind: 'XLSX',
    role: 'PRIMARY',
    trust: { regulatory: 90, profile: 100, contact: 100, research: 100 },
    asOf: '2026-10-04',
    description: 'UAE 11-operator verification pass with per-aircraft verification status.',
  },
  {
    code: 'AE_FULL_ENRICHMENT',
    fileName: 'UAE_ThePrivate_11_Full_Enrichment.xlsx',
    country: 'AE',
    kind: 'XLSX',
    role: 'ENRICHMENT_LAYER',
    trust: { regulatory: 85, profile: 80, contact: 80, research: 80 },
    asOf: '2026-10-04',
    description: 'UAE full enrichment (superseded by Aircraft_Verified for aircraft status).',
  },
  {
    code: 'AE_OPERATOR_ENRICHMENT',
    fileName: 'UAE_ThePrivate_11_Operator_Enrichment.xlsx',
    country: 'AE',
    kind: 'XLSX',
    role: 'ENRICHMENT_LAYER',
    trust: { regulatory: 80, profile: 60, contact: 60, research: 60 },
    asOf: null,
    description: 'Original UAE operator enrichment (oldest layer).',
  },
  {
    code: 'AE_GCAA_APPROVED_OPERATORS',
    fileName: 'Approved UAE Air Operators.pdf',
    country: 'AE',
    kind: 'PDF',
    role: 'AUTHORITY_REGISTRY',
    trust: { regulatory: 120 },
    asOf: '2026-10-04',
    description: 'GCAA open dataset: approved UAE Air Operators. A source list, not evidence of charter inventory.',
  },
];

export function sourceByCode(code: string): SourceDescriptor {
  const s = SOURCES.find((x) => x.code === code);
  if (!s) throw new Error(`Unknown source ${code}`);
  return s;
}
