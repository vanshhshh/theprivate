import { Field, Input, Textarea } from '@/components/ui/form';

export function ClaimFields({ operatorId }: { operatorId?: string }) {
  return (
    <>
      {operatorId && <input type="hidden" name="operatorId" value={operatorId} />}
      <Field name="claimantRole" label="Your role"><Input name="claimantRole" placeholder="e.g. Director, Head of charter" required /></Field>
      <Field name="workEmail" label="Work e-mail" hint="Use your company domain where possible; it speeds up review."><Input name="workEmail" type="email" required /></Field>
      <Field name="workPhone" label="Work phone"><Input name="workPhone" type="tel" /></Field>
      <Field name="authorityNumber" label="DGCA / GCAA certificate number"><Input name="authorityNumber" /></Field>
      <Field name="message" label="Anything we should know" className="md:col-span-2"><Textarea name="message" rows={3} /></Field>
    </>
  );
}
