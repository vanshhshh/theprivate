'use server';

import { redirect } from 'next/navigation';
import type { FormState } from '@/components/ui/form';
import { nestedForm } from '@/lib/form-data';
import { runAction } from '@/server/action';
import { requireViewer } from '@/server/auth/viewer';
import { createRfq } from '@/server/services/rfq';

export async function createRfqAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const v = await requireViewer();
    return createRfq(v, nestedForm(fd));
  });
  if (res.ok) redirect(`/account/trips/${res.data.reference}?new=1`);
  return res;
}
