import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { LuxuryButton } from "@/components/luxury";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trips, notifications] = await Promise.all([
    db.booking.count({ where: { userId: user.id } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <main>
      <section className="section">
        <div className="shell accountGrid">
          <div className="surface">
            <span className="microLabel">Profile</span>
            <h1>{user.name}</h1>
            <div className="detailRows">
              <p><b>Email</b><span>{user.email}</span></p>
              <p><b>Phone</b><span>{user.phone || "Not added"}</span></p>
              <p><b>Account</b><span>{user.role.toLowerCase()}</span></p>
              <p><b>Joined</b><span>{user.createdAt.toLocaleDateString("en-IN")}</span></p>
              <p><b>Verification</b><span>Basic account</span></p>
              <p><b>Trips</b><span>{trips}</span></p>
            </div>
            <div className="actions">
              <LuxuryButton href="/trips">OPEN TRIPS</LuxuryButton>
              <LuxuryButton href="/settings" variant="light">SETTINGS</LuxuryButton>
            </div>
          </div>
          <aside className="surface">
            <span className="microLabel">Traveler information</span>
            <h2>Saved details.</h2>
            <p className="muted">Passenger details can be added during booking. Profile editing is intentionally limited until identity checks are enabled.</p>
            <div className="fleetRows">
              {notifications.map((notification) => (
                <div className="fleetRow" key={notification.id}>
                  <span><b>{notification.title}</b><small className="muted">{notification.body}</small></span>
                </div>
              ))}
              {!notifications.length && <p className="muted">No notifications yet.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
