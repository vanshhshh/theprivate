import { categoryLabel } from '@/components/domain/status';
import { PageHeader, Table } from '@/components/ui/display';
import { ActionForm, Input, SubmitButton } from '@/components/ui/form';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { typeSpecsAction } from '../../actions';

export const metadata = { title: 'Aircraft types' };

export default async function Types() {
  const v = await requirePermissionPage('aircraft.read', '/admin/data/types');
  const types = await prisma.aircraftType.findMany({ orderBy: [{ manufacturer: 'asc' }, { model: 'asc' }], include: { _count: { select: { aircraft: true } } } });
  const editable = can(v, 'aircraft.review');
  return (
    <>
      <PageHeader eyebrow="Data" title="Aircraft type catalogue" lede="Specifications are empty until entered with a citation (manufacturer data, AFM, operator spec sheet). Indicative prices and range checks use them only when present." />
      <Table head={['Type', 'Category', 'Aircraft', 'Seats', 'Range (NM)', 'Cruise (KTAS)', 'Source', '']}>
        {types.map((t) => (
          <tr key={t.id}>
            <td>{t.manufacturer} {t.model}<span className="block text-xs text-muted">{t.family}</span></td>
            <td className="text-sm">{categoryLabel(t.category)}</td>
            <td className="strip">{t._count.aircraft}</td>
            {editable ? (
              <td colSpan={5}>
                <ActionForm action={typeSpecsAction} className="grid grid-cols-[70px_80px_80px_1fr_auto] items-end gap-3">
                  <input type="hidden" name="id" value={t.id} />
                  <Input name="typicalSeats" defaultValue={t.typicalSeats ?? ''} aria-label="Typical seats" className="strip" />
                  <Input name="rangeNm" defaultValue={t.rangeNm ?? ''} aria-label="Range NM" className="strip" />
                  <Input name="cruiseKtas" defaultValue={t.cruiseKtas ?? ''} aria-label="Cruise KTAS" className="strip" />
                  <Input name="specsSource" defaultValue={t.specsSource ?? ''} aria-label="Source citation" placeholder="Citation (required with any spec)" />
                  <SubmitButton variant="ghost" className="h-8 px-2 text-xs">Save</SubmitButton>
                </ActionForm>
              </td>
            ) : (
              <>
                <td className="strip">{t.typicalSeats ?? '—'}</td><td className="strip">{t.rangeNm ?? '—'}</td><td className="strip">{t.cruiseKtas ?? '—'}</td><td className="text-xs">{t.specsSource ?? '—'}</td><td />
              </>
            )}
          </tr>
        ))}
      </Table>
    </>
  );
}
