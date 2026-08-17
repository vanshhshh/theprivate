import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { LuxuryButton } from "@/components/luxury";

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
          <div className="sectionHeading">
            <span>Overview</span>
            <h1>Marketplace control.</h1>
            <p>Real-time metrics across operators, aircraft, bookings and requests.</p>
          </div>

          <div className="actionStrip" style={{ marginBottom: 34 }}>
            <div>
              <span className="microLabel">OPERATORS</span>
              <h3>Verified</h3>
              <b>{verifiedOperatorsCount}</b>
              <small className="muted">{unverifiedOperatorsCount} unverified</small>
            </div>
            <div>
              <span className="microLabel">AIRCRAFT</span>
              <h3>Active</h3>
              <b>{activeAircraftCount}</b>
              <small className="muted">{aircraftCount} total</small>
            </div>
            <div>
              <span className="microLabel">BOOKINGS</span>
              <h3>Confirmed</h3>
              <b>{confirmedBookingsCount}</b>
              <small className="muted">{pendingBookingsCount} pending</small>
            </div>
            <div>
              <span className="microLabel">REQUESTS</span>
              <h3>Open RFQs</h3>
              <b>{openRfqsCount}</b>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="surface" style={{ marginBottom: 34 }}>
              <span className="microLabel">Alerts</span>
              <div className="fleetRows">
                {alerts.map((alert: any) => (
                  <div className="fleetRow" key={alert.href}>
                    <span><b>{alert.label}</b><small className="muted">{alert.value} items need attention</small></span>
                    <Link className="luxuryButton light" href={alert.href}>VIEW</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface">
            <span className="microLabel">Quick links</span>
            <div className="actionStrip">
              <Link className="luxuryButton ghost" href="/admin/operators">Operators</Link>
              <Link className="luxuryButton ghost" href="/admin/aircraft">Aircraft</Link>
              <Link className="luxuryButton ghost" href="/admin/bookings">Bookings</Link>
              <Link className="luxuryButton ghost" href="/admin/rfqs">RFQs</Link>
              <Link className="luxuryButton ghost" href="/admin/quotes">Quotes</Link>
              <Link className="luxuryButton ghost" href="/admin/claims">Claims</Link>
              <Link className="luxuryButton ghost" href="/admin/users">Users</Link>
              <Link className="luxuryButton ghost" href="/admin/audit">Audit</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
