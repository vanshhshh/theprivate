import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { DL, PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { formatDate } from '@/lib/time';
import { prisma } from '@/server/db/client';
import { addMemberAction, profileAction } from '../../actions';

export const metadata = { title: 'Profile & team' };

export default async function Profile() {
  const { operatorId, membership } = await requireOperatorPage('/operator/profile');
  const op = await prisma.operator.findUniqueOrThrow({
    where: { id: operatorId },
    include: { authorizations: true, memberships: { where: { status: 'ACTIVE' }, include: { user: { select: { name: true, email: true } } } } },
  });
  const canEdit = hasRole(membership.role, 'MANAGER');
  return (
    <>
      <PageHeader eyebrow="Company" title="Profile & team" lede="Your public description appears on your operator page once ThePrivate lists you publicly." />
      <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionTitle>Public profile</SectionTitle>
          <ActionForm action={profileAction} className="grid gap-6">
            <Field name="displayName" label="Trading name"><Input name="displayName" defaultValue={op.displayName} disabled={!canEdit} required /></Field>
            <Field name="website" label="Website"><Input name="website" type="url" defaultValue={op.website ?? ''} disabled={!canEdit} placeholder="https://" /></Field>
            <Field name="baseDescription" label="Main bases" hint="e.g. Mumbai (VABB), Delhi (VIDP)"><Input name="baseDescription" defaultValue={op.baseDescription ?? ''} disabled={!canEdit} /></Field>
            <Field name="headquartersAddress" label="Registered address"><Textarea name="headquartersAddress" rows={2} defaultValue={op.headquartersAddress ?? ''} disabled={!canEdit} /></Field>
            <Field name="publicDescription" label="About your company" hint="Factual, no unverifiable claims. Reviewed before public listing."><Textarea name="publicDescription" rows={5} defaultValue={op.publicDescription ?? ''} disabled={!canEdit} /></Field>
            {canEdit && <SubmitButton>Save profile</SubmitButton>}
          </ActionForm>
        </section>
        <aside className="flex flex-col gap-12">
          <section>
            <SectionTitle>Regulatory record</SectionTitle>
            {op.authorizations.map((a) => (
              <DL key={a.id} items={[
                ['Authority', `${a.authority} · ${a.certificateType}`],
                ['Number', a.numberStatus === 'VALID' ? <span key="n" className="strip">{a.numberRaw}</span> : <span key="n" className="text-danger">Unreadable in source: we will confirm with you</span>],
                ['Valid until', a.validUntil ? formatDate(a.validUntil) : null],
                ['Checked by ThePrivate', a.verifiedAt ? formatDate(a.verifiedAt) : 'Not yet'],
              ]} />
            ))}
            <p className="mt-3 text-xs text-muted">Regulatory details are confirmed by our team during verification.</p>
          </section>
          <section>
            <SectionTitle>Team</SectionTitle>
            <Table head={['Name', 'Role']}>
              {op.memberships.map((m) => (
                <tr key={m.id}><td>{m.user.name}<span className="block text-xs text-muted">{m.user.email}</span></td><td className="text-sm">{m.role.toLowerCase()}</td></tr>
              ))}
            </Table>
            {membership.role === 'OWNER' && (
              <ActionForm action={addMemberAction} resetOnSuccess className="mt-6 grid gap-5">
                <Field name="email" label="Add a colleague by e-mail" hint="They need a ThePrivate account first."><Input name="email" type="email" required /></Field>
                <Field name="role" label="Role">
                  <Select name="role" defaultValue="DISPATCHER"><option value="MANAGER">Manager: fleet, pricing, profile</option><option value="DISPATCHER">Dispatcher: requests, quotes, availability</option><option value="VIEWER">Viewer: read only</option></Select>
                </Field>
                <SubmitButton variant="secondary">Add member</SubmitButton>
              </ActionForm>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
