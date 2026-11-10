import type { Metadata } from 'next';
import { Notice, PageHeader } from '@/components/ui/display';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Terms() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8">
      <PageHeader eyebrow="Legal" title="Terms of use" />
      <Notice tone="warning" title="Draft pending legal review">
        This is a working draft prepared with the platform. It sets out how ThePrivate operates today but must be reviewed and approved by qualified counsel before public launch.
      </Notice>
      <div className="mt-10 space-y-6 leading-relaxed text-ink-2 [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink">
        <h2>1. What ThePrivate is</h2>
        <p>ThePrivate operates an online marketplace that connects customers with independent, licensed air operators. ThePrivate is not an air operator and does not operate flights. Each flight is operated by the operator named in the accepted quote, under that operator’s licence.</p>
        <h2>2. Requests, quotes and bookings</h2>
        <p>Submitting a request does not reserve or book a flight. A quote is an offer from an operator, valid until the time stated. Accepting a quote creates a booking request that becomes a confirmed booking only when the operator confirms it. A booking is paid only when ThePrivate has verified settlement.</p>
        <h2>3. Prices</h2>
        <p>Prices labelled “indicative” are estimates and are not offers. The price in a quote includes ThePrivate’s fee. Taxes are shown as included or excluded on each quote.</p>
        <h2>4. Empty legs</h2>
        <p>Empty-leg flights depend on the operator’s schedule and may change or be withdrawn. An enquiry does not hold a seat.</p>
        <h2>5. Aircraft sales</h2>
        <p>Sale listings are provided by sellers. ThePrivate reviews listings for completeness but does not inspect aircraft or verify title. Buyers must conduct their own due diligence.</p>
        <h2>6. Accounts</h2>
        <p>You are responsible for your account credentials and for the accuracy of information you provide.</p>
        <h2>7. Liability, governing law and disputes</h2>
        <p>To be completed by counsel.</p>
      </div>
    </div>
  );
}
