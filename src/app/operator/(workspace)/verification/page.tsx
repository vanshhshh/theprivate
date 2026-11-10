import { Status } from '@/components/domain/status';
import { Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import type { VerificationCheckType } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/time';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { REQUIRED_CHECKS } from '@/server/services/operators';
import { submitVerificationAction, uploadCheckAction } from '../../actions';

export const metadata = { title: 'Verification' };

const LABELS: Record<VerificationCheckType, [string, string]> = {
  AUTHORITY_CERTIFICATE: ['Operating certificate', 'DGCA NSOP permit or GCAA AOC, current and legible.'],
  COMPANY_REGISTRATION: ['Company registration', 'Certificate of incorporation or trade licence.'],
  INSURANCE: ['Insurance certificate', 'Hull and third-party liability cover in force.'],
  TAX_REGISTRATION: ['Tax registration', 'GSTIN / TRN certificate.'],
  BANK_DETAILS: ['Bank details', 'Cancelled cheque or bank letter for settlements.'],
  SIGNATORY_IDENTITY: ['Authorised signatory', 'Board resolution or authority letter.'],
  SAFETY_AUDIT: ['Safety audit (optional)', 'Recent third-party audit, if available.'],
};

export default async function Verification() {
  const { operatorId, membership } = await requireOperatorPage('/operator/verification');
  const checks = await prisma.verificationCheck.findMany({ where: { operatorId }, include: { document: { select: { fileName: true, id: true } } } });
  const byType = new Map(checks.map((c) => [c.type, c]));
  const lifecycle = membership.operator.lifecycle;
  const canSubmit = lifecycle === 'CLAIMED' && REQUIRED_CHECKS.every((t) => ['SUBMITTED', 'ACCEPTED'].includes(byType.get(t)?.status ?? ''));
  const canUpload = hasRole(membership.role, 'MANAGER');
  return (
    <>
      <PageHeader eyebrow="Company" title="Verification" lede="We check every operator before it can receive requests. Documents are private: only your team and ThePrivate staff can open them." />
      {lifecycle === 'IN_REVIEW' && <div className="mb-8"><Notice>Submitted. Our team is reviewing your documents.</Notice></div>}
      {['VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE'].includes(lifecycle) && <div className="mb-8"><Notice tone="success">Your company is verified.</Notice></div>}
      <ul className="grid gap-px bg-line md:grid-cols-2">
        {(Object.keys(LABELS) as VerificationCheckType[]).map((type) => {
          const c = byType.get(type);
          const [title, desc] = LABELS[type];
          return (
            <li key={type} className="flex flex-col gap-4 bg-paper p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{title}{REQUIRED_CHECKS.includes(type) && <span className="ml-2 text-xs text-magenta">required</span>}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
                <Status kind="check" value={c?.status ?? 'PENDING'} />
              </div>
              {c?.document && <a className="text-sm underline underline-offset-4" href={`/api/files/${c.document.id}`}>{c.document.fileName}</a>}
              {c?.expiresAt && <p className="text-xs text-muted">Expires {formatDate(c.expiresAt)}</p>}
              {c?.reviewNote && <p className="text-sm text-danger">Reviewer: {c.reviewNote}</p>}
              {canUpload && c?.status !== 'ACCEPTED' && (
                <ActionForm action={uploadCheckAction} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_150px]">
                  <input type="hidden" name="type" value={type} />
                  <Field name="file" label={c ? 'Replace file' : 'Upload'} hint="PDF, JPG, PNG or WebP · max 10 MB"><Input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="border-0 text-sm" /></Field>
                  <Field name="expiresAt" label="Expiry (if any)"><Input name="expiresAt" type="date" /></Field>
                  <SubmitButton variant="secondary" className="sm:col-span-2 justify-self-start">Upload</SubmitButton>
                </ActionForm>
              )}
            </li>
          );
        })}
      </ul>
      {lifecycle === 'CLAIMED' && (
        <section className="mt-10">
          <SectionTitle>Submit for review</SectionTitle>
          {membership.role === 'OWNER' ? (
            <ActionForm action={submitVerificationAction} className="flex flex-wrap items-center gap-5">
              <SubmitButton disabled={!canSubmit}>Submit for verification</SubmitButton>
              {!canSubmit && <p className="text-sm text-muted">Upload all required documents first.</p>}
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">The company owner submits for review.</p>
          )}
        </section>
      )}
    </>
  );
}
