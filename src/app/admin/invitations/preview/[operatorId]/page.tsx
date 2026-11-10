import Link from 'next/link';
import { whyReceiving } from '@/domain/invitations/compose';
import { Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { requirePermissionPage } from '@/server/auth/viewer';
import { previewFor } from '@/server/invitations/service';
import { sendTestAction } from '../../actions';

export const metadata = { title: 'Invitation preview' };
export const dynamic = 'force-dynamic';

export default async function Preview({ params }: { params: Promise<{ operatorId: string }> }) {
  const { operatorId } = await params;
  const viewer = await requirePermissionPage('invite.manage', `/admin/invitations/preview/${operatorId}`);
  const { candidate: c, email } = await previewFor(operatorId);
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/invitations" className="hover:underline">Company invitations</Link>} title={c.name} lede={`${c.categoryLabel} · ${c.countryCode}${c.eligibility.eligible ? '' : ' · not eligible'}`} />
      {!c.eligibility.eligible && <div className="mb-8"><Notice tone="warning" title="Not eligible">{c.eligibility.reasons.join('; ')}</Notice></div>}
      {!email || !c.facts ? (
        <p className="text-muted">No usable business address, so there is no message to preview.</p>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section>
            <SectionTitle>Message</SectionTitle>
            <p className="mb-1 text-[13px] text-muted">To</p>
            <p className="strip mb-4">{c.facts.recipientName ? `${c.facts.recipientName} <${c.facts.recipientEmail}>` : c.facts.recipientEmail}</p>
            <p className="mb-1 text-[13px] text-muted">Subject</p>
            <p className="mb-6 font-medium">{email.subject}</p>
            <iframe title="E-mail preview" sandbox="" srcDoc={email.html} className="h-[820px] w-full rounded-sm border border-line bg-paper" />
            <details className="mt-6"><summary className="cursor-pointer text-[14px] text-sectional">Plain-text version</summary><pre className="mt-3 whitespace-pre-wrap rounded-sm bg-paper-2 p-4 text-[13px]">{email.text}</pre></details>
          </section>
          <aside className="flex flex-col gap-8">
            <div>
              <SectionTitle>Why this company receives it</SectionTitle>
              <p className="text-[14px] text-ink-2">{whyReceiving(c.facts)}</p>
              <p className="mt-3 text-[13px] text-muted">The unique claim link is generated only at the moment of sending, and only its hash is stored. In the preview it is a placeholder.</p>
            </div>
            <div>
              <SectionTitle>Send a test</SectionTitle>
              <p className="mb-4 text-[14px] text-ink-2">Sends this exact message, marked [TEST], to your own inbox through the real SMTP account. The test link opens the invitation page but can never claim the company.</p>
              <ActionForm action={sendTestAction} className="grid gap-4">
                <input type="hidden" name="operatorId" value={c.operatorId} />
                <Field name="to" label="Send to"><Input name="to" type="email" defaultValue={viewer.user.email} required /></Field>
                <SubmitButton pendingLabel="Sending…">Send test e-mail</SubmitButton>
              </ActionForm>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
