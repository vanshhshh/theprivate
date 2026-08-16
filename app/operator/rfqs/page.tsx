import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { RouteDisplay } from "@/components/luxury";

export default async function OperatorRfqsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");

  const operator = await db.operator.findUnique({ where: { id: user.operatorId }, include: { aircraft: { select: { seats: true, active: true } } } });
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
        <div className="shell">
          <div className="sectionHeading"><span>Charter requests</span><h1>Open customer requests.</h1></div>
          <div className="resultList">
            {rfqs.map((rfq) => (
              <article className="surface" key={rfq.id}>
                <RouteDisplay from={rfq.origin} to={rfq.destination} />
                <p className="muted">{rfq.departureAt.toLocaleString("en-IN")} / {rfq.passengers} passengers</p>
                <p>{rfq.notes || "No extra notes."}</p>
                <span className="pill">{rfq.quotes.length ? "Quoted" : "Open"}</span>
              </article>
            ))}
            {!rfqs.length && <div className="emptyState"><h2>No open requests.</h2><p>Matching charter requests will appear here.</p></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
