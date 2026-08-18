import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminAvailability() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const listings = await db.availability.findMany({ orderBy: { createdAt: "desc" }, include: { aircraft: true, operator: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Availability</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Published availability.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Operator</th>
                  <th>Aircraft</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.origin} to {item.destination}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{item.operator?.name}</td>
                    <td>{item.aircraft?.registration || "-"}</td>
                    <td>Rs {(item.price / 100000).toFixed(1)}L</td>
                    <td><span className="badge badge-muted">{item.emptyLeg ? "Empty leg" : "Charter"}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!listings.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No availability published.</p>}
        </div>
      </section>
    </main>
  );
}
