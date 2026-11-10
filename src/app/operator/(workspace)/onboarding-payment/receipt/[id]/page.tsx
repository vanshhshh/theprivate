import { notFound } from 'next/navigation';
import { formatMinor } from '@/domain/payments/onboarding';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { PrintButton } from './print-button';

export const metadata = { title: 'Receipt' };
export const dynamic = 'force-dynamic';

/** Printable receipt. Scoped to the viewer's own company; another company's id returns 404. */
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { operatorId } = await requireOperatorPage('/operator/onboarding-payment');
  const p = await prisma.onboardingPayment.findFirst({ where: { id, operatorId, receiptNumber: { not: null } }, include: { operator: { select: { legalName: true, headquartersAddress: true, countryCode: true } } } });
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-2xl rounded-sm bg-paper p-10 text-ink shadow-[0_20px_60px_-40px_rgba(0,0,0,.5)] print:shadow-none">
      <header className="flex items-start justify-between border-b border-ink pb-6">
        <div><p className="font-display text-[26px]"><em>The</em>Private</p><p className="text-[13px] text-muted">{process.env.SENDER_POSTAL_ADDRESS ?? 'ThePrivate'}</p></div>
        <div className="text-right"><p className="strip text-[12px] uppercase tracking-[0.2em] text-muted">Receipt</p><p className="strip mt-1">{p.receiptNumber}</p></div>
      </header>
      <section className="grid grid-cols-2 gap-6 py-6 text-[14px]">
        <div><p className="text-muted">Billed to</p><p className="mt-1 font-medium">{p.operator.legalName}</p>{p.operator.headquartersAddress && <p className="text-ink-2">{p.operator.headquartersAddress}</p>}</div>
        <div className="text-right"><p className="text-muted">Payment date</p><p className="mt-1">{p.paidAt?.toISOString().slice(0, 10)}</p><p className="mt-3 text-muted">Transaction reference</p><p className="strip mt-1 break-all">{p.providerPaymentId}</p></div>
      </section>
      <table className="w-full text-[14px]">
        <tbody className="[&_td]:py-2.5">
          <tr className="border-b border-line"><td>Company onboarding fee (one-time)</td><td className="strip text-right">{formatMinor(p.feeMinor, p.currency)}</td></tr>
          <tr className="border-b border-line"><td>{p.taxLabel ?? 'Tax'}{p.taxRateBps ? ` (${p.taxRateBps / 100}%)` : ''}</td><td className="strip text-right">{formatMinor(p.taxMinor, p.currency)}</td></tr>
          <tr className="text-[16px] font-medium"><td>Total paid ({p.currency})</td><td className="strip text-right">{formatMinor(p.totalMinor, p.currency)}</td></tr>
          {p.refundedMinor > 0 && <tr className="text-danger"><td>Refunded</td><td className="strip text-right">−{formatMinor(p.refundedMinor, p.currency)}</td></tr>}
        </tbody>
      </table>
      <p className="mt-8 text-[12px] leading-relaxed text-muted">This receipt confirms payment of the company onboarding fee to ThePrivate. It is not a tax invoice unless issued as one. Payment does not verify or activate the company.</p>
      <div className="mt-8 print:hidden"><PrintButton /></div>
    </article>
  );
}
