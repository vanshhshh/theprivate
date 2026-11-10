import Link from 'next/link';
import { categoryLabel, Status } from '@/components/domain/status';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, Notice, PageHeader, Pill, Table } from '@/components/ui/display';
import { requireOperatorPage } from '@/server/auth/viewer';
import { listFleet } from '@/server/services/fleet';

export const metadata = { title: 'Fleet' };

export default async function Fleet() {
  const { operatorId } = await requireOperatorPage('/operator/fleet');
  const fleet = await listFleet(operatorId);
  const imported = fleet.filter((a) => a.reviewStatus === 'IMPORTED_UNREVIEWED').length;
  return (
    <>
      <PageHeader eyebrow="Fleet" title="Aircraft" lede="Only aircraft you confirm and ThePrivate approves can be quoted or listed as empty legs." actions={<LinkButton href="/operator/fleet/new">Add aircraft</LinkButton>} />
      {imported > 0 && (
        <div className="mb-8">
          <Notice tone="warning" title={`${imported} aircraft imported from public records`}>
            These came from regulator lists or public sources and may be out of date. Open each one to confirm it is still in your fleet, correct the details, and submit it for review. Remove nothing yourself: tell us if an aircraft is no longer yours.
          </Notice>
        </div>
      )}
      {fleet.length === 0 ? (
        <EmptyState title="No aircraft yet" action={<LinkButton href="/operator/fleet/new">Add your first aircraft</LinkButton>} />
      ) : (
        <Table head={['Registration', 'Type', 'Seats', 'Base', 'Review', 'Status', 'Charter']}>
          {fleet.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/operator/fleet/${a.id}`} className="strip text-sectional underline underline-offset-4">{a.registration}</Link>{a.attributionUncertain && <span className="block text-xs text-danger">Ownership unconfirmed</span>}</td>
              <td>{a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : <span className="text-muted">{a.modelRaw ?? '—'}</span>}<span className="block text-xs text-muted">{categoryLabel(a.aircraftType?.category)}</span></td>
              <td className="strip">{a.seats ?? '—'}</td>
              <td className="strip text-sm">{a.homeBase ? (a.homeBase.iata ?? a.homeBase.icao) : '—'}</td>
              <td><Status kind="aircraftReview" value={a.reviewStatus} /></td>
              <td className="text-sm">{a.operationalStatus.toLowerCase()}</td>
              <td>{a.charterEligible ? <Pill tone="verified">Enabled</Pill> : <Pill tone="unconfirmed">Off</Pill>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
