import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminAviation() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const airports = await db.airport.findMany({ orderBy: { city: "asc" }, take: 50 });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Aviation</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Airports.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>IATA</th>
                  <th>Airport</th>
                  <th>City</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {airports.map((airport) => (
                  <tr key={airport.id}>
                    <td style={{ fontWeight: 600 }}>{airport.iata}</td>
                    <td>{airport.name}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{airport.city}</td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{airport.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!airports.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No airports seeded.</p>}
        </div>
      </section>
    </main>
  );
}
