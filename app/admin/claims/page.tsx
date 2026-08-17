import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminClaims() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const claims = await db.claim.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { operator: { include: { aircraft: true } } } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Claims</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Operator claims.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Fleet</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ fontWeight: 600 }}>{claim.operator?.name || "Unknown"}</td>
                    <td><span className="badge badge-muted">{claim.status}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{claim.createdAt.toLocaleDateString("en-US")}</td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{claim.operator?.aircraft.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!claims.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No claims submitted.</p>}
        </div>
      </section>
    </main>
  );
}
