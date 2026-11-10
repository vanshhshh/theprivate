'use client';

import { useEffect, useRef, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea, useActionFormState, useFieldError, type FormState } from '@/components/ui/form';
import { fieldControl, fieldLabel } from '@/components/ui/styles';
import { cn } from '@/lib/cn';
import { AirportCombobox, airportCode, type AirportPick } from './airport-combobox';
import { CATEGORY_OPTIONS, categoryLabel } from './status';

type Leg = { key: number; from: AirportPick | null; to: AirportPick | null; date: string; time: string };
type Trip = 'ONE_WAY' | 'RETURN' | 'MULTI_LEG';
type Initial = { from: AirportPick | null; to: AirportPick | null; date: string; returnDate: string; pax: number; category: string; note: string };

const STEPS = ['Your journey', 'Who is travelling', 'Your details'] as const;

function LegDate({ name, defaultValue, min, onChange }: { name: string; defaultValue: string; min: string; onChange: (v: string) => void }) {
  const error = useFieldError(name.replace(/\[(\w+)\]/g, '.$1'));
  return (
    <div className="group flex flex-col gap-1">
      <label htmlFor={name} className={fieldLabel}>Date</label>
      <input id={name} name={name} type="date" defaultValue={defaultValue} min={min} required onChange={(e) => onChange(e.target.value)} className={cn(fieldControl, error && 'border-danger')} />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Which step holds a server-reported field error. */
function stepOf(field: string) {
  if (field.startsWith('legs') || field === 'tripType') return 0;
  if (['passengers', 'category', 'petsOnBoard', 'requirements'].includes(field)) return 1;
  return 2;
}

function Steps({ initial, defaultName }: { initial: Initial; defaultName: string }) {
  const state = useActionFormState();
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip>(initial.returnDate ? 'RETURN' : 'ONE_WAY');
  const [legs, setLegs] = useState<Leg[]>(() => {
    const l: Leg[] = [{ key: 0, from: initial.from, to: initial.to, date: initial.date, time: '' }];
    if (initial.returnDate) l.push({ key: 1, from: initial.to, to: initial.from, date: initial.returnDate, time: '' });
    return l;
  });
  const [pax, setPax] = useState(initial.pax);
  const panels = useRef<(HTMLFieldSetElement | null)[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  // A server error lands the customer on the step that needs attention.
  useEffect(() => {
    if (state && !state.ok) {
      const first = Object.keys(state.fieldErrors ?? {})[0];
      setStep(first ? stepOf(first) : 2);
    }
  }, [state]);

  function setTripType(t: Trip) {
    setTrip(t);
    setLegs((prev) => {
      const first = prev[0]!;
      if (t === 'ONE_WAY') return [first];
      if (t === 'RETURN') return [first, prev[1] ?? { key: Date.now(), from: first.to, to: first.from, date: '', time: '' }];
      return prev.length >= 2 ? prev : [...prev, { key: Date.now(), from: first.to, to: null, date: '', time: '' }];
    });
  }
  const patch = (key: number, p: Partial<Leg>) => setLegs((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  function next() {
    const panel = panels.current[step];
    if (step === 0 && legs.some((l) => !l.from || !l.to)) {
      setHint('Choose a departure and a destination for each flight.');
      return;
    }
    const invalid = panel ? Array.from(panel.querySelectorAll<HTMLInputElement>('input, select, textarea')).find((el) => !el.checkValidity()) : undefined;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setHint(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <input type="hidden" name="tripType" value={trip} />
        <ol aria-label="Steps" className="mb-12 flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined} className="group w-full text-left disabled:cursor-default">
                <span className={cn('block h-[2px] rounded-full transition-colors duration-[var(--dur-3)]', i <= step ? 'bg-magenta' : 'bg-line')} />
                <span className={cn('mt-3 block text-[13px]', i === step ? 'text-ink' : 'text-muted', i < step && 'group-hover:text-ink')}>
                  <span className="strip mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <fieldset ref={(el) => { panels.current[0] = el; }} hidden={step !== 0} className="[animation:scene-in_var(--dur-3)_var(--ease-climb)_both]">
          <legend className="font-display mb-8 text-[36px] leading-tight md:text-[44px]">Where are you <em>flying?</em></legend>
          <div role="radiogroup" aria-label="Trip type" className="mb-8 flex w-fit gap-1 rounded-full bg-ink/5 p-1 text-sm">
            {(['ONE_WAY', 'RETURN', 'MULTI_LEG'] as const).map((t) => (
              <button type="button" role="radio" aria-checked={trip === t} key={t} onClick={() => setTripType(t)} className={cn('rounded-full px-4 py-1.5 transition-colors', trip === t ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink')}>
                {t === 'ONE_WAY' ? 'One way' : t === 'RETURN' ? 'Return' : 'Several stops'}
              </button>
            ))}
          </div>
          <ol className="flex flex-col gap-8">
            {legs.map((leg, i) => (
              <li key={leg.key} className="grid gap-6 border-l border-line pl-6 md:grid-cols-[1fr_1fr_170px_130px_auto] md:items-end">
                <AirportCombobox name={`legs[${i}][from]`} label={legs.length > 1 ? `Flight ${i + 1} · from` : 'From'} initial={leg.from} onPick={(a) => patch(leg.key, { from: a })} />
                <AirportCombobox name={`legs[${i}][to]`} label="To" initial={leg.to} onPick={(a) => patch(leg.key, { to: a })} />
                <LegDate name={`legs[${i}][date]`} defaultValue={leg.date} min={today} onChange={(v) => patch(leg.key, { date: v })} />
                <div className="group flex flex-col gap-1">
                  <label htmlFor={`legs[${i}][time]`} className={fieldLabel}>Preferred time</label>
                  <input id={`legs[${i}][time]`} name={`legs[${i}][time]`} type="time" defaultValue={leg.time} className={fieldControl} />
                </div>
                {trip === 'MULTI_LEG' && legs.length > 2 ? (
                  <button type="button" onClick={() => setLegs((l) => l.filter((x) => x.key !== leg.key))} className="pb-3 text-sm text-muted hover:text-danger">Remove</button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
          {trip === 'MULTI_LEG' && legs.length < 6 && (
            <button type="button" onClick={() => setLegs((l) => [...l, { key: Date.now(), from: l.at(-1)?.to ?? null, to: null, date: '', time: '' }])} className="mt-6 text-sm font-medium text-magenta">
              + Add another flight
            </button>
          )}
          <p className="mt-6 text-[13px] text-muted">Leave the time empty if you are flexible. Times are local to each departure.</p>
        </fieldset>

        <fieldset ref={(el) => { panels.current[1] = el; }} hidden={step !== 1} className="grid gap-8 md:grid-cols-2 [animation:scene-in_var(--dur-3)_var(--ease-climb)_both]">
          <legend className="font-display mb-8 text-[36px] leading-tight md:text-[44px]">Who is <em>travelling?</em></legend>
          <Field name="passengers" label="Passengers">
            <Input name="passengers" type="number" min={1} max={400} value={pax} onChange={(e) => setPax(Number(e.target.value) || 1)} required className="strip" />
          </Field>
          <Field name="category" label="Preferred aircraft size">
            <Select name="category" defaultValue={initial.category}>
              <option value="">No preference</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-3 text-[15px] md:col-span-2">
            <input type="checkbox" name="petsOnBoard" value="true" className="size-[18px] accent-magenta" /> Travelling with pets
          </label>
          <Field name="requirements" label="Anything we should know?" className="md:col-span-2" hint="Luggage, catering, accessibility, flexibility, a preferred aircraft…">
            <Textarea name="requirements" defaultValue={initial.note} maxLength={2000} />
          </Field>
        </fieldset>

        <fieldset ref={(el) => { panels.current[2] = el; }} hidden={step !== 2} className="grid gap-8 md:grid-cols-2 [animation:scene-in_var(--dur-3)_var(--ease-climb)_both]">
          <legend className="font-display mb-8 text-[36px] leading-tight md:text-[44px]">How can we <em>reach you?</em></legend>
          <Field name="contactName" label="Lead passenger">
            <Input name="contactName" defaultValue={defaultName} required autoComplete="name" />
          </Field>
          <Field name="contactPhone" label="Phone (optional)" hint="Shared with the flight partner only once you book.">
            <Input name="contactPhone" type="tel" autoComplete="tel" />
          </Field>
        </fieldset>

        {hint && <p role="alert" className="mt-6 text-sm text-danger">{hint}</p>}
        <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-line pt-8">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={buttonClass('ghost', 'lg')}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={buttonClass('primary', 'lg')}>
              Continue <span className="arrow" aria-hidden>→</span>
            </button>
          ) : (
            <SubmitButton pendingLabel="Sending your request…" className="h-14 px-8 text-base">Send request</SubmitButton>
          )}
          <p className="max-w-sm text-[13px] text-muted">Free, and it does not book or reserve a flight.</p>
        </div>
      </div>

      <aside aria-label="Summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-sm bg-night p-7 text-paper">
          <p className="strip mb-6 text-[11px] uppercase tracking-[0.22em] text-dusk">Your request</p>
          <ol className="flex flex-col gap-5">
            {legs.map((l, i) => (
              <li key={l.key}>
                <p className="strip text-[11px] text-paper/45">{legs.length > 1 ? `Flight ${i + 1}` : 'Flight'}{l.date ? ` · ${new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>
                <p className="font-display mt-1 text-[24px] leading-tight">
                  {l.from ? l.from.city ?? l.from.name : '—'} <span className="text-dusk">→</span> {l.to ? l.to.city ?? l.to.name : '—'}
                </p>
                {l.from && l.to && <p className="strip text-[11px] text-paper/45">{airportCode(l.from)} · {airportCode(l.to)}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-paper/15 pt-5 text-[15px] text-paper/80">
            {pax} {pax === 1 ? 'passenger' : 'passengers'}
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-paper/55">We send your request only to checked flight partners with a suitable aircraft. You will see every offer, with what it includes, before you decide.</p>
        </div>
      </aside>
    </div>
  );
}

export function RfqForm({ action, initial, defaultName }: { action: (s: FormState, fd: FormData) => Promise<FormState>; initial: Initial; defaultName: string }) {
  return (
    <ActionForm action={action}>
      <Steps initial={initial} defaultName={defaultName} />
    </ActionForm>
  );
}
