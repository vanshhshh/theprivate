'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/components/ui/form';
import { ContactTopic } from '@/generated/prisma/enums';
import { files } from '@/lib/form-data';
import { runAction } from '@/server/action';
import { getViewer, requireViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';
import { notify, staffWith } from '@/server/notifications';
import { enquireEmptyLeg } from '@/server/services/empty-legs';
import { submitBuyerEnquiry, submitListing } from '@/server/services/sales';

const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => !k.startsWith('$ACTION') && typeof v === 'string'));

export async function emptyLegEnquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const v = await getViewer();
    if (!v) redirect(`/sign-in?next=/empty-legs/${fd.get('id')}`);
    await enquireEmptyLeg(await requireViewer(), String(fd.get('id')), { passengers: fd.get('passengers'), message: fd.get('message') ?? undefined });
  }, 'Enquiry sent to the operator. This is not a booking. They will respond, usually within a few hours.');
}

export async function buyerEnquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    if (fd.get('website')) throw new AppError('VALIDATION', 'Rejected.'); // honeypot
    await submitBuyerEnquiry(await getViewer(), String(fd.get('listingId')), obj(fd));
  }, 'Enquiry received. Our sales desk will connect you with the seller.');
}

export async function sellAircraftAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => submitListing(await requireViewer(), obj(fd), files(fd, 'photos'), files(fd, 'documents')));
  if (res.ok) redirect('/account/listings?submitted=1');
  return res as FormState;
}

const contactSchema = z.object({
  topic: z.enum(ContactTopic),
  name: z.string().trim().min(2).max(120),
  email: z.email('Enter a valid e-mail'),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
});

export async function contactAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    if (fd.get('website')) throw new AppError('VALIDATION', 'Rejected.'); // honeypot
    const input = contactSchema.parse(obj(fd));
    const recent = await prisma.contactMessage.count({ where: { email: input.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= 3) throw new AppError('RATE_LIMITED', 'You have sent several messages recently. We will reply soon.');
    const v = await getViewer();
    await prisma.contactMessage.create({ data: { ...input, email: input.email.toLowerCase(), phone: input.phone || null, userId: v?.user.id ?? null } });
    await notify({ userIds: await staffWith(['SUPPORT', 'OPERATIONS', 'SUPER_ADMIN']), type: 'contact.message', title: `New ${input.topic.toLowerCase()} message`, body: input.message.slice(0, 140), link: '/admin/messages' });
  }, 'Thank you. Your message has reached our team and we will reply by e-mail.');
}
