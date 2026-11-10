import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { AirportCombobox, type AirportPick } from './airport-combobox';
import { categoryLabel } from './status';

export function AircraftFields({
  types,
  initial,
  lockRegistration,
}: {
  types: { id: string; manufacturer: string; model: string; category: string }[];
  initial?: { registration?: string; aircraftTypeId?: string | null; seats?: number | null; yearOfManufacture?: number | null; serialNumber?: string | null; homeBase?: AirportPick | null; publicDescription?: string | null; modelRaw?: string | null };
  lockRegistration?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Field name="registration" label="Registration" hint={lockRegistration ? 'Registration cannot be changed. Contact support if it is wrong.' : 'e.g. VT-ABC or A6-XYZ'}>
        <Input name="registration" defaultValue={initial?.registration ?? ''} required disabled={lockRegistration} className="strip uppercase" />
      </Field>
      <Field name="aircraftTypeId" label="Aircraft type" hint={initial?.modelRaw ? `Source record says: “${initial.modelRaw}”` : undefined}>
        <Select name="aircraftTypeId" defaultValue={initial?.aircraftTypeId ?? ''} required>
          <option value="">Choose type…</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.manufacturer} {t.model} · {categoryLabel(t.category)}</option>
          ))}
        </Select>
      </Field>
      <Field name="seats" label="Passenger seats (configured)">
        <Input name="seats" type="number" min={1} max={400} defaultValue={initial?.seats ?? ''} required className="strip" />
      </Field>
      <Field name="yearOfManufacture" label="Year of manufacture">
        <Input name="yearOfManufacture" type="number" min={1950} max={new Date().getFullYear()} defaultValue={initial?.yearOfManufacture ?? ''} className="strip" />
      </Field>
      <Field name="serialNumber" label="Serial number (MSN)">
        <Input name="serialNumber" defaultValue={initial?.serialNumber ?? ''} className="strip" />
      </Field>
      <AirportCombobox name="homeBaseAirportId" label="Home base" initial={initial?.homeBase ?? null} />
      <Field name="publicDescription" label="Cabin & highlights (public)" className="md:col-span-2" hint="Factual: layout, refurbishment year, connectivity. Shown once approved.">
        <Textarea name="publicDescription" rows={3} defaultValue={initial?.publicDescription ?? ''} />
      </Field>
    </div>
  );
}
