import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { RouteDisplay } from "@/components/luxury";

export default async function OperatorRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");

  const operator = await db.operator.findUnique({ where: { id: user.operatorId }, select: { aircraft: { select: { seats: true, active: true } } } });
  const maxSeats = Math.max(0, ...(operator?.aircraft.filter((item) => item.active).map((item) => item.seats || 0) || [0]));
  const rfqs = await db.rfq.findMany({
    where: { status: "OPEN", passengers: { lte: Math.max(maxSeats, 1) } },
    include: { user: { select: { name: true, email: true } }, quotes: { where: { operatorId: user.operatorId } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Charter requests</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Open customer requests.</h1>
            <p className="muted">Matching charter requests from customers.</p>
          </div>
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {rfqs.map((rfq) => (
              <div key={rfq.id} style={{ padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
                  <RouteDisplay from={rfq.origin} to={rfq.destination} />
                  <span className="badge badge-muted">{rfq.quotes.length ? "Quoted" : "Open"}</span>
                </div>
                <p className="muted" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
                  {rfq.departureAt.toLocaleString("en-US")} / {rfq.passengers} passengers / {rfq.user.email}
                </p>
                {rfq.notes && <p style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", marginBottom: "var(--space-3)" }}>{rfq.notes}</p>}
                {!rfq.quotes.length && (
                  <form action={`/api/operator/quotes`} method="POST" style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                    <input type="hidden" name="rfqId" value={rfq.id} />
                    <input type="hidden" name="aircraftId" value="" />
                    <input type="number" name="price" placeholder="Price (INR)" className="input" style={{ maxWidth: 180 }} required />
                    <button type="submit" className="btn btn-sm btn-dark">Submit quote</button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {!rfqs.length && <div className="empty-state"><h3>No open requests.</h3><p>Matching charter requests will appear here.</p></div>}
        </div>
      </section>
    </main>
  );
}
