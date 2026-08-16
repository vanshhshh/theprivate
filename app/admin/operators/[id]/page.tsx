import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { LuxuryButton } from "@/components/luxury";

export default async function AdminOperatorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const operator = await db.operator.findUnique({
    where: { id },
    include: { aircraft: true, claims: { include: { user: true } }, bookings: true, availability: true, quotes: true },
  });
  if (!operator) notFound();

  return (
    <main>
      <section className="section">
        <div className="shell accountGrid">
          <div className="surface">
            <span className="microLabel">Operator</span>
            <h1>{operator.name}</h1>
            <div className="detailRows">
              <p><b>DGCA ID</b><span>{operator.dgcaId}</span></p>
              <p><b>AOP</b><span>{operator.aopNumber || "Not listed"}</span></p>
              <p><b>Email</b><span>{operator.email || "Not listed"}</span></p>
              <p><b>Status</b><span>{operator.active ? "Active" : "Suspended"} / {operator.verified ? "Verified" : "Unverified"}</span></p>
              <p><b>Claim</b><span>{operator.claimed ? "Claimed" : "Unclaimed"}</span></p>
            </div>
            <div className="actions">
              <LuxuryButton href={`/operator/${operator.id}`} variant="light">PUBLIC PROFILE</LuxuryButton>
              <LuxuryButton href="/admin/operators">ALL OPERATORS</LuxuryButton>
            </div>
          </div>
          <aside className="surface">
            <span className="microLabel">Activity</span>
            <div className="actionStrip compact">
              <div><span className="microLabel">Aircraft</span><b>{operator.aircraft.length}</b></div>
              <div><span className="microLabel">Claims</span><b>{operator.claims.length}</b></div>
              <div><span className="microLabel">Bookings</span><b>{operator.bookings.length}</b></div>
              <div><span className="microLabel">Listings</span><b>{operator.availability.length}</b></div>
            </div>
            <div className="fleetRows">
              {operator.aircraft.slice(0, 12).map((aircraft) => (
                <div className="fleetRow" key={aircraft.id}>
                  <span><b>{aircraft.registration}</b><small className="muted">{aircraft.model || aircraft.type || "Aircraft"}</small></span>
                  <span className="pill">{aircraft.verified ? "Verified" : "Needs review"}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
