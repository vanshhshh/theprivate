import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminAircraft() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const aircraft = await db.aircraft.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { operator: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Aircraft</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Registered aircraft.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Operator</th>
                  <th>Seats</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {aircraft.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.registration}</td>
                    <td>{item.model || item.type || "-"}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{item.operator?.name}</td>
                    <td>{item.seats || "-"}</td>
                    <td><span className="badge badge-muted">{item.active ? "Active" : "Inactive"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!aircraft.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No aircraft registered.</p>}
        </div>
      </section>
    </main>
  );
}
