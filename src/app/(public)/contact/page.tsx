import type { Metadata } from 'next';
import Link from 'next/link';
import { Resolve, scene, SceneImage } from '@/components/cinematic/scene';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { getViewer } from '@/server/auth/viewer';
import { contactAction } from '../actions';

export const metadata: Metadata = { title: 'Contact', description: 'Talk to ThePrivate about a flight, an aircraft sale, partnership or your account.' };

export default async function Contact() {
  const v = await getViewer();
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative isolate flex min-h-[64svh] flex-col overflow-hidden bg-night text-paper lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)]">
        <SceneImage plate={scene('window-light')} sizes="(min-width:1024px) 48vw, 100vw" priority drift={false} />
        <div aria-hidden className="scene-grade absolute inset-0" />
        <div className="relative mt-auto px-5 pb-12 pt-24 md:px-12 md:pb-16">
          <p className="resolve-late strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk">Contact</p>
          <h1 className="font-display text-[48px] leading-[0.98] md:text-[76px]">
            <Resolve text="We are" />
            <br />
            <Resolve text="listening." className="italic" offset={2} />
          </h1>
          <p className="resolve-late mt-6 max-w-md text-[17px] leading-relaxed text-paper/85">
            Planning a flight? The quickest way is to <Link href="/charter" className="underline decoration-paper/40 underline-offset-4 hover:decoration-paper">send us the journey</Link>. For anything else, write here.
          </p>
        </div>
      </section>
      <section className="px-5 py-16 md:px-12 lg:py-28">
        <ActionForm action={contactAction} resetOnSuccess className="mx-auto grid max-w-xl gap-8 md:grid-cols-2">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <Field name="topic" label="What is it about?" className="md:col-span-2">
            <Select name="topic" defaultValue="CHARTER">
              <option value="CHARTER">A flight</option>
              <option value="SALES">Buying or selling an aircraft</option>
              <option value="SUPPORT">My account or a booking</option>
              <option value="OPERATOR">Partnering with ThePrivate</option>
              <option value="PRESS">Press</option>
              <option value="OTHER">Something else</option>
            </Select>
          </Field>
          <Field name="name" label="Name"><Input name="name" defaultValue={v?.user.name ?? ''} required autoComplete="name" /></Field>
          <Field name="email" label="E-mail"><Input name="email" type="email" defaultValue={v?.user.email ?? ''} required autoComplete="email" /></Field>
          <Field name="phone" label="Phone (optional)" className="md:col-span-2"><Input name="phone" type="tel" autoComplete="tel" /></Field>
          <Field name="message" label="Message" className="md:col-span-2"><Textarea name="message" rows={6} required /></Field>
          <div className="md:col-span-2"><SubmitButton className="h-14 px-8 text-base">Send message</SubmitButton></div>
        </ActionForm>
      </section>
    </div>
  );
}
