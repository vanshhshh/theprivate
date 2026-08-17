import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PriceDisplay, RouteDisplay } from "@/components/luxury";

export default async function OperatorQuotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  const quotes = await db.quote.findMany({
    where: { operatorId: user.operatorId },
    include: { rfq: true, aircraft: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Quotes</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Submitted charter quotes.</h1>
          </div>
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {quotes.map((quote) => (
              <div key={quote.id} style={{ padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                  <RouteDisplay from={quote.rfq.origin} to={quote.rfq.destination} />
                  <span className="badge badge-muted">{quote.status}</span>
                </div>
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <b style={{ fontSize: "var(--text-base)", fontFamily: "var(--serif)", fontWeight: 500 }}>{quote.aircraft?.model || "Aircraft to confirm"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "var(--space-4)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Valid until {quote.validUntil.toLocaleString("en-US")}</span>
                  <PriceDisplay value={quote.price} />
                </div>
              </div>
            ))}
          </div>
          {!quotes.length && <div className="empty-state"><h3>No quotes submitted.</h3><p>Quotes created for customer requests will appear here.</p></div>}
        </div>
      </section>
    </main>
  );
}
