import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminBookings() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const bookings = await db.booking.findMany({ orderBy: { createdAt: "desc" }, include: { user: true, aircraft: true, operator: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Bookings</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>All bookings.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Customer</th>
                  <th>Aircraft</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td style={{ fontWeight: 600 }}>{booking.origin} to {booking.destination}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{booking.user?.email}</td>
                    <td>{booking.aircraft?.model || "-"}</td>
                    <td>Rs {(booking.price / 100000).toFixed(1)}L</td>
                    <td><span className="badge badge-muted">{booking.status.replaceAll("_", " ")}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{booking.departureAt.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!bookings.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No bookings yet.</p>}
        </div>
      </section>
    </main>
  );
}
