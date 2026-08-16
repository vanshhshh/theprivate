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
    include: { aircraft: true, rfq: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="sectionHeading"><span>Quotes</span><h1>Submitted charter quotes.</h1></div>
          <div className="resultList">
            {quotes.map((quote) => (
              <article className="surface" key={quote.id}>
                <RouteDisplay from={quote.rfq.origin} to={quote.rfq.destination} />
                <h2>{quote.aircraft?.model || "Aircraft to confirm"}</h2>
                <p className="muted">Valid until {quote.validUntil.toLocaleString("en-IN")} / {quote.status}</p>
                <PriceDisplay value={quote.price} />
              </article>
            ))}
            {!quotes.length && <div className="emptyState"><h2>No quotes submitted.</h2><p>Quotes created for customer requests will appear here.</p></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
