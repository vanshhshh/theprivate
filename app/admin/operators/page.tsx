import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminOperators() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const operators = await db.operator.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { aircraft: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Operators</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Registered operators.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>DGCA</th>
                  <th>Aircraft</th>
                  <th>Status</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((operator) => (
                  <tr key={operator.id}>
                    <td>
                      <Link href={`/admin/operators/${operator.id}`} style={{ fontWeight: 600 }}>{operator.name}</Link>
                    </td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{operator.dgcaId}</td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{operator.aircraft.length}</td>
                    <td><span className="badge badge-muted">{operator.verified ? "Verified" : "Pending"}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{operator.verified ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!operators.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No operators registered.</p>}
        </div>
      </section>
    </main>
  );
}
