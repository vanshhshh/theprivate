import type { Metadata } from 'next';
import { CATEGORY_OPTIONS, categoryLabel } from '@/components/domain/status';
import { SceneHero } from '@/components/cinematic/scene';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { requireViewerPage } from '@/server/auth/viewer';
import { sellAircraftAction } from '../actions';

export const metadata: Metadata = { title: 'Sell an aircraft', description: 'List your aircraft on ThePrivate. Every listing is reviewed before publication; your contact details stay private.' };

const legend = 'font-display mb-8 text-[32px] leading-tight md:text-[40px]';
const chapter = 'grid gap-8 border-t border-ink pt-10';

export default async function Sell() {
  const v = await requireViewerPage('/sell-aircraft');
  return (
    <>
    <SceneHero scene="ramp-dusk" size="band" eyebrow="Sell your aircraft" title="Present it" titleItalic="beautifully." lede="Share the details and photos. We review every listing before it appears, and buyers reach you only through us." />
    <div className="mx-auto max-w-[1080px] px-5 py-16 md:px-12">
      <ActionForm action={sellAircraftAction} className="flex flex-col gap-16">
        <fieldset className={`${chapter} md:grid-cols-3`}>
          <legend className={legend}>The <em>aircraft</em></legend>
          <Field name="category" label="Category"><Select name="category" required defaultValue="">{[<option key="" value="">Choose…</option>, ...CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)]}</Select></Field>
          <Field name="manufacturer" label="Manufacturer"><Input name="manufacturer" required /></Field>
          <Field name="model" label="Model"><Input name="model" required /></Field>
          <Field name="yearOfManufacture" label="Year of manufacture"><Input name="yearOfManufacture" type="number" min={1950} required className="strip" /></Field>
          <Field name="registration" label="Registration"><Input name="registration" className="strip uppercase" /></Field>
          <Field name="serialNumber" label="Serial number"><Input name="serialNumber" className="strip" /></Field>
          <Field name="totalTimeHours" label="Total time (hours)"><Input name="totalTimeHours" type="number" min={0} className="strip" /></Field>
          <Field name="landings" label="Landings / cycles"><Input name="landings" type="number" min={0} className="strip" /></Field>
          <Field name="sellerType" label="You are the"><Select name="sellerType" defaultValue="OWNER"><option value="OWNER">Owner</option><option value="OPERATOR">Operator</option><option value="BROKER">Broker (mandated)</option></Select></Field>
          <Field name="locationText" label="Current location" className="md:col-span-2"><Input name="locationText" placeholder="e.g. Mumbai (VABB)" required /></Field>
          <Field name="locationCountry" label="Country"><Select name="locationCountry" defaultValue="IN"><option value="IN">India</option><option value="AE">United Arab Emirates</option><option value="">Other</option></Select></Field>
        </fieldset>
        <fieldset className={`${chapter} md:grid-cols-3`}>
          <legend className={legend}>The <em>price</em></legend>
          <Field name="currency" label="Currency"><Select name="currency" defaultValue="USD">{['USD', 'INR', 'AED', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field name="askingPrice" label="Asking price"><Input name="askingPrice" inputMode="decimal" className="strip" /></Field>
          <div className="flex items-end pb-3"><Checkbox name="priceOnRequest" value="true" label="Price on request" /></div>
        </fieldset>
        <fieldset className={chapter}>
          <legend className={legend}>The <em>story</em></legend>
          <Field name="headline" label="Headline"><Input name="headline" maxLength={140} required placeholder="e.g. Low-time, single-owner, fresh 12-year inspection" /></Field>
          <Field name="description" label="Description" hint="Maintenance status, programmes, interior, avionics, damage history. Be factual: we may ask for evidence."><Textarea name="description" rows={8} required /></Field>
          <Field name="photos" label="Photos (up to 12)" hint="JPG, PNG or WebP · 10 MB each · published only after approval"><Input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="border-0 text-sm" /></Field>
          <Field name="documents" label="Supporting documents (private, up to 6)" hint="Spec sheet, maintenance summary. PDF or images. Never published."><Input name="documents" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="border-0 text-sm" /></Field>
        </fieldset>
        <fieldset className={`${chapter} md:grid-cols-3`}>
          <legend className={legend}>How we reach <em>you</em> <span className="font-sans text-[15px] text-muted">· never shown publicly</span></legend>
          <Field name="contactName" label="Name"><Input name="contactName" defaultValue={v.user.name} required /></Field>
          <Field name="contactEmail" label="E-mail"><Input name="contactEmail" type="email" defaultValue={v.user.email} required /></Field>
          <Field name="contactPhone" label="Phone"><Input name="contactPhone" type="tel" defaultValue={v.user.phone ?? ''} /></Field>
        </fieldset>
        <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
          <SubmitButton pendingLabel="Uploading…">Submit for review</SubmitButton>
          <p className="max-w-md text-sm text-muted">By submitting you confirm you are authorised to sell or market this aircraft.</p>
        </div>
      </ActionForm>
    </div>
    </>
  );
}
