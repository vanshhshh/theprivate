import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminQuotes() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const quotes = await db.quote.findMany({ orderBy: { createdAt: "desc" }, include: { rfq: true, operator: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Quotes</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Submitted quotes.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Operator</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Valid until</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td style={{ fontWeight: 600 }}>{quote.rfq?.origin} to {quote.rfq?.destination}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{quote.operator?.name}</td>
                    <td>Rs {(quote.price / 100000).toFixed(1)}L</td>
                    <td><span className="badge badge-muted">{quote.status}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{quote.validUntil.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!quotes.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No quotes yet.</p>}
        </div>
      </section>
    </main>
  );
}
