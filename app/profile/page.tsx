import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function CustomerProfile() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "OPERATOR") redirect("/operator/profile");
  if (user.role === "ADMIN") redirect("/admin");
  const customer = await db.user.findUnique({
    where: { id: user.id },
    include: { bookings: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!customer) notFound();

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Profile</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>{customer.name || "Your account"}</h1>
          </div>
          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-7)" }}>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Account</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Email</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{customer.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Role</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, textTransform: "capitalize" }}>{customer.role.toLowerCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Member since</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{customer.createdAt.toLocaleDateString("en-US")}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <span className="eyebrow">Recent trips</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Your most recent flights.</h3>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
              {customer.bookings.map((booking: any) => (
                <div key={booking.id} style={{ padding: "var(--space-5) 0", borderBottom: "var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                    <div>
                      <b style={{ fontSize: "var(--text-base)", fontFamily: "var(--serif)", fontWeight: 500 }}>{booking.origin} to {booking.destination}</b>
                      <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{booking.departureAt.toLocaleString("en-US")}</span>
                    </div>
                    <span className="badge badge-muted">{booking.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
              ))}
              {!customer.bookings.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No trips yet.</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
