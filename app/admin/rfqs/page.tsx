import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminRfqs() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const rfqs = await db.rfq.findMany({ orderBy: { createdAt: "desc" }, include: { user: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Requests</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Charter requests.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Customer</th>
                  <th>Passengers</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td style={{ fontWeight: 600 }}>{rfq.origin} to {rfq.destination}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{rfq.user?.email}</td>
                    <td>{rfq.passengers}</td>
                    <td><span className="badge badge-muted">{rfq.status}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{rfq.departureAt.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rfqs.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No requests yet.</p>}
        </div>
      </section>
    </main>
  );
}
