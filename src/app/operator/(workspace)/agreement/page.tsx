import { DL, EmptyState, Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Checkbox, Field, Input, SubmitButton } from '@/components/ui/form';
import { formatDate } from '@/lib/time';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { acceptAgreementAction } from '../../actions';

export const metadata = { title: 'Agreement' };

export default async function AgreementPage() {
  const { operatorId, membership, viewer } = await requireOperatorPage('/operator/agreement');
  const agreements = await prisma.agreement.findMany({ where: { operatorId }, orderBy: { version: 'desc' } });
  const sent = agreements.find((a) => a.status === 'SENT');
  const signed = agreements.find((a) => a.status === 'SIGNED');
  return (
    <>
      <PageHeader eyebrow="Company" title="Commercial agreement" lede="These terms are confidential between your company and ThePrivate." />
      {!sent && !signed && <EmptyState title="No agreement yet">Agreements are issued once your company is verified.</EmptyState>}
      {sent && (
        <section className="mb-12">
          <SectionTitle>Version {sent.version}: awaiting your signature</SectionTitle>
          <DL items={[
            ['Platform fee', `${(sent.commissionBps / 100).toFixed(2)} % added to your quoted price`],
            ['Minimum fee', sent.minimumFee ? `${sent.minimumFee.toString()} ${sent.currency}` : 'None'],
            ['Settlement currency', sent.currency],
            ['Issued', formatDate(sent.createdAt)],
          ]} />
          <div className="mt-6"><Notice tone="warning" title="Important">
            Customers see your price plus ThePrivate’s fee. You are paid your quoted price for completed, settled bookings. Full legal terms are provided separately by ThePrivate; acceptance here is recorded with your name, time and IP address.
          </Notice></div>
          {membership.role === 'OWNER' ? (
            <ActionForm action={acceptAgreementAction} className="mt-8 grid max-w-lg gap-6">
              <input type="hidden" name="agreementId" value={sent.id} />
              <Checkbox name="read" required label="I have read the agreement and am authorised to sign for the company." />
              <Field name="typedName" label={`Type your full name to sign (${viewer.user.name})`}><Input name="typedName" required autoComplete="off" /></Field>
              <SubmitButton>Sign agreement</SubmitButton>
            </ActionForm>
          ) : (
            <p className="mt-6 text-sm text-muted">The company owner signs the agreement.</p>
          )}
        </section>
      )}
      {signed && (
        <section>
          <SectionTitle>Signed agreement · version {signed.version}</SectionTitle>
          <DL items={[
            ['Platform fee', `${(signed.commissionBps / 100).toFixed(2)} %`],
            ['Currency', signed.currency],
            ['Signed', signed.signedAt ? `${formatDate(signed.signedAt)} by ${signed.acceptedName}` : null],
          ]} />
        </section>
      )}
    </>
  );
}
