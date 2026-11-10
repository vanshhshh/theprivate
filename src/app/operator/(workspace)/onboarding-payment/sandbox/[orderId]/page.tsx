import { notFound } from 'next/navigation';
import { formatMinor } from '@/domain/payments/onboarding';
import { Notice } from '@/components/ui/display';
import { ActionForm, SubmitButton } from '@/components/ui/form';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { onboardingProvider } from '@/server/payments/onboarding/providers';
import { sandboxOutcomeAction } from '../../actions';

export const metadata = { title: 'Sandbox checkout' };
export const dynamic = 'force-dynamic';

/**
 * Stand-in for a provider's hosted checkout, available only when the sandbox provider is active
 * (never in production). Each button sends a SIGNED event through the real webhook code path.
 */
export default async function SandboxCheckout({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (onboardingProvider()?.name !== 'sandbox') notFound();
  const { operatorId } = await requireOperatorPage('/operator/onboarding-payment');
  const p = await prisma.onboardingPayment.findFirst({ where: { provider: 'sandbox', providerOrderId: decodeURIComponent(orderId), operatorId } });
  if (!p) notFound();
  return (
    <div className="max-w-xl">
      <Notice tone="warning" title="Development sandbox">No real money moves. Each button sends a signed provider event through the same verification as a real gateway.</Notice>
      <h1 className="font-display mt-8 text-[36px]">Pay {formatMinor(p.totalMinor, p.currency)}</h1>
      <p className="mt-2 text-muted">Status: {p.status}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {(['paid', 'failed', 'cancelled'] as const).map((o) => (
          <ActionForm key={o} action={sandboxOutcomeAction}>
            <input type="hidden" name="orderId" value={p.providerOrderId!} />
            <input type="hidden" name="outcome" value={o} />
            <SubmitButton variant={o === 'paid' ? 'primary' : 'secondary'}>{o === 'paid' ? 'Simulate successful payment' : o === 'failed' ? 'Simulate failure' : 'Cancel'}</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </div>
  );
}
