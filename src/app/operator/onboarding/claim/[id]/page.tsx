import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, SubmitButton } from '@/components/ui/form';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { claimAction } from '../../../actions';
import { ClaimFields } from '../../claim-fields';

export const metadata = { title: 'Claim operator profile' };

export default async function ClaimOperator({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewerPage(`/operator/onboarding/claim/${id}`);
  const target = await prisma.operator.findUnique({ where: { id }, select: { id: true, legalName: true, countryCode: true, lifecycle: true, deletedAt: true } });
  if (!target || target.deletedAt || ['EXCLUDED', 'REJECTED'].includes(target.lifecycle)) notFound();
  return (
    <>
        <PageHeader eyebrow="Operators" title={`Claim ${target.legalName}`} lede="Tell us who you are. Our supply team checks every claim against the company’s public and regulatory records before granting access." />
        <SectionTitle aside={<Link href="/operator/onboarding" className="hover:text-ink">Choose another company</Link>}>Your details</SectionTitle>
        <ActionForm action={claimAction} className="grid gap-6 md:grid-cols-2">
          <ClaimFields operatorId={target.id} />
          <div className="md:col-span-2">
            <SubmitButton>Submit claim</SubmitButton>
          </div>
        </ActionForm>
    </>
  );
}
