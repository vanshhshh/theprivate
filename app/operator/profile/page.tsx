import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function OperatorProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  const operator = await db.operator.findUnique({
    where: { id: user.operatorId },
    include: { aircraft: true, availability: true, bookings: true },
  });
  if (!operator) redirect("/operator/login");

  return (
    <main>
      <section className="section">
        <div className="shell accountGrid">
          <div className="surface">
            <span className="microLabel">Operator profile</span>
            <h1>{operator.name}</h1>
            <div className="detailRows">
              <p><b>DGCA ID</b><span>{operator.dgcaId}</span></p>
              <p><b>AOP</b><span>{operator.aopNumber || "Not listed"}</span></p>
              <p><b>Email</b><span>{operator.email || "Not listed"}</span></p>
              <p><b>Phone</b><span>{operator.phone || "Not listed"}</span></p>
              <p><b>Website</b><span>{operator.website || "Not listed"}</span></p>
              <p><b>Status</b><span>{operator.verified ? "Verified" : "Pending verification"}</span></p>
            </div>
          </div>
          <aside className="surface">
            <span className="microLabel">Readiness</span>
            <div className="actionStrip compact">
              <div><span className="microLabel">Fleet</span><b>{operator.aircraft.length}</b></div>
              <div><span className="microLabel">Active</span><b>{operator.aircraft.filter((item) => item.active).length}</b></div>
              <div><span className="microLabel">Listings</span><b>{operator.availability.length}</b></div>
              <div><span className="microLabel">Bookings</span><b>{operator.bookings.length}</b></div>
            </div>
            <p className="muted">Regulatory identifiers are locked for admin verification.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
