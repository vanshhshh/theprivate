import { AircraftFields } from '@/components/domain/aircraft-form';
import { PageHeader } from '@/components/ui/display';
import { ActionForm, SubmitButton } from '@/components/ui/form';
import { requireOperatorPage } from '@/server/auth/viewer';
import { aircraftTypeOptions } from '@/server/services/fleet';
import { addAircraftAction } from '../../../actions';

export const metadata = { title: 'Add aircraft' };

export default async function NewAircraft() {
  await requireOperatorPage('/operator/fleet/new');
  const types = await aircraftTypeOptions();
  return (
    <>
      <PageHeader eyebrow="Fleet" title="Add an aircraft" lede="Saved as a draft. Submit it for review when the details are complete." />
      <ActionForm action={addAircraftAction} className="flex max-w-4xl flex-col gap-8">
        <AircraftFields types={types} />
        <SubmitButton className="self-start">Save draft</SubmitButton>
      </ActionForm>
    </>
  );
}
