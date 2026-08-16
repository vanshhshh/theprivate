import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function OperatorNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  const notifications = await db.notification.findMany({
    where: { operatorId: user.operatorId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="sectionHeading"><span>Notifications</span><h1>Updates that need attention.</h1></div>
          <div className="fleetRows">
            {notifications.map((notification) => (
              <article className="fleetRow" key={notification.id}>
                <span><b>{notification.title}</b><small className="muted">{notification.body}</small></span>
                <span className="pill">{notification.readAt ? "Read" : "Unread"}</span>
              </article>
            ))}
            {!notifications.length && <div className="emptyState"><h2>You are all caught up.</h2><p>No operator notifications yet.</p></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
