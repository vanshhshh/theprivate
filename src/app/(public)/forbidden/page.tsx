import { LinkButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/display';

export const metadata = { title: 'No access', robots: { index: false } };

export default function Forbidden() {
  return (
    <div className="mx-auto max-w-[800px] px-5 py-20">
      <EmptyState title="You don’t have access to this page" action={<LinkButton href="/account" variant="secondary">Go to your account</LinkButton>}>
        If you think you should, ask a ThePrivate administrator to grant the right role.
      </EmptyState>
    </div>
  );
}
