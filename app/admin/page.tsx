import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const [operators, aircraft, bookings, rfqs, claims, users] = await Promise.all([
    db.operator.count(),
    db.aircraft.count(),
    db.booking.count(),
    db.rfq.count(),
    db.claim.count(),
    db.user.count(),
  ]);
  const activeAircraft = await db.aircraft.count({ where: { active: true } });
  const verifiedOperators = await db.operator.count({ where: { verified: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-8)" }}>
            <span className="eyebrow">Overview</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Marketplace at a glance.</h1>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-8)" }}>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Operators</span>
              <div style={{ fontSize: "var(--text-5xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-3)" }}>{operators}</div>
              <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>{verifiedOperators} verified</span>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Aircraft</span>
              <div style={{ fontSize: "var(--text-5xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-3)" }}>{aircraft}</div>
              <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>{activeAircraft} active</span>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Open requests</span>
              <div style={{ fontSize: "var(--text-5xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-3)" }}>{rfqs}</div>
              <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Awaiting quotes</span>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Bookings</span>
              <div style={{ fontSize: "var(--text-5xl)", fontFamily: "var(--serif)", fontWeight: 500, marginTop: "var(--space-3)" }}>{bookings}</div>
              <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Total</span>
            </div>
          </div>

          <div>
            <span className="eyebrow">Action required</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Items needing attention.</h3>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                <div>
                  <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Claims</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{claims} pending review</span>
                </div>
                <Link href="/admin/claims" className="btn btn-sm">Review</Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                <div>
                  <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Users</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{users} registered</span>
                </div>
                <Link href="/admin/users" className="btn btn-sm">View</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
