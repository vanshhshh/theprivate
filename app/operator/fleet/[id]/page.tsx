import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function OperatorAircraftDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  const { id } = await params;
  const aircraft = await db.aircraft.findFirst({
    where: { id, operatorId: user.operatorId },
    include: { availability: { orderBy: { departureAt: "desc" }, take: 10 }, bookings: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!aircraft) notFound();

  return (
    <main>
      <section className="section">
        <div className="shell accountGrid">
          <div className="surface">
            <span className="microLabel">Aircraft</span>
            <h1>{aircraft.registration}</h1>
            <div className="detailRows">
              <p><b>Model</b><span>{aircraft.model || aircraft.type || "Aircraft"}</span></p>
              <p><b>Seats</b><span>{aircraft.seats || "Not listed"}</span></p>
              <p><b>ICAO24</b><span>{aircraft.icao24 || "Not enriched"}</span></p>
              <p><b>Status</b><span>{aircraft.active ? "Active" : "Inactive"} / {aircraft.verified ? "Verified" : "Needs review"}</span></p>
              <p><b>Hourly rate</b><span>{aircraft.hourlyRate ? `Rs ${(aircraft.hourlyRate / 100000).toFixed(1)}L` : "Uses default"}</span></p>
            </div>
          </div>
          <aside className="surface">
            <span className="microLabel">Recent activity</span>
            <div className="fleetRows">
              {aircraft.availability.map((item) => (
                <div className="fleetRow" key={item.id}>
                  <span><b>{item.origin} to {item.destination}</b><small className="muted">{item.status} / {item.departureAt.toLocaleDateString("en-IN")}</small></span>
                </div>
              ))}
              {!aircraft.availability.length && <p className="muted">No availability published.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
