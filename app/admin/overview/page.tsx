import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/luxury";

export default async function AdminOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");

  const [
    operatorsCount,
    verifiedOperatorsCount,
    unverifiedOperatorsCount,
    aircraftCount,
    activeAircraftCount,
    pendingClaimsCount,
    openRfqsCount,
    pendingBookingsCount,
    confirmedBookingsCount,
    totalBookingsCount,
    availabilityCount,
    activeAvailabilityCount,
    notificationsCount,
  ] = await Promise.all([
    db.operator.count(),
    db.operator.count({ where: { verified: true } }),
    db.operator.count({ where: { verified: false } }),
    db.aircraft.count(),
    db.aircraft.count({ where: { active: true } }),
    db.claim.count({ where: { status: "PENDING" } }),
    db.rfq.count({ where: { status: "OPEN" } }),
    db.booking.count({ where: { status: "REQUESTED" } }),
    db.booking.count({ where: { status: { in: ["OPERATOR_CONFIRMED", "PAID", "CONFIRMED"] } } }),
    db.booking.count(),
    db.availability.count(),
    db.availability.count({ where: { status: { in: ["ACTIVE", "PUBLISHED"] } } }),
    db.notification.count({ where: { readAt: null } }),
  ]);

  const alerts = [
    pendingClaimsCount > 0 && { label: "Operator claims pending", value: pendingClaimsCount, href: "/admin/claims" },
    openRfqsCount > 0 && { label: "Open charter requests", value: openRfqsCount, href: "/admin/rfqs" },
    pendingBookingsCount > 0 && { label: "Pending booking requests", value: pendingBookingsCount, href: "/admin/bookings" },
    unverifiedOperatorsCount > 0 && { label: "Unverified operators", value: unverifiedOperatorsCount, href: "/admin/operators" },
  ].filter(Boolean);

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Overview</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Marketplace control.</h1>
            <p>Real-time metrics across operators, aircraft, bookings and requests.</p>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-7)" }}>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Operators</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-1)" }}>
                <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{verifiedOperatorsCount}</div>
                <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>{unverifiedOperatorsCount} unverified</span>
              </div>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Aircraft</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-1)" }}>
                <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{activeAircraftCount}</div>
                <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>{aircraftCount} total</span>
              </div>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Bookings</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-1)" }}>
                <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{confirmedBookingsCount}</div>
                <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>{pendingBookingsCount} pending</span>
              </div>
            </div>
            <div style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Requests</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-1)" }}>
                <div style={{ fontSize: "var(--text-4xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{openRfqsCount}</div>
                <span className="muted" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Open RFQs</span>
              </div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)", marginBottom: "var(--space-7)" }}>
              <span className="eyebrow">Alerts</span>
              <div style={{ display: "grid", gap: 0, borderTop: "var(--border)", marginTop: "var(--space-4)" }}>
                {alerts.map((alert: any) => (
                  <div key={alert.href} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                    <span>
                      <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{alert.label}</b>
                      <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{alert.value} items need attention</span>
                    </span>
                    <Button href={alert.href} variant="light">View</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)" }}>
            <span className="eyebrow">Quick links</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
              {[
                ["/admin/operators", "Operators"],
                ["/admin/aircraft", "Aircraft"],
                ["/admin/bookings", "Bookings"],
                ["/admin/rfqs", "RFQs"],
                ["/admin/quotes", "Quotes"],
                ["/admin/claims", "Claims"],
                ["/admin/users", "Users"],
                ["/admin/audit", "Audit"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="btn btn-sm btn-ghost">{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
