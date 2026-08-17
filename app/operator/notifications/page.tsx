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
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Notifications</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Updates that need attention.</h1>
          </div>
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {notifications.map((notification) => (
              <div key={notification.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                <div>
                  <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{notification.title}</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{notification.body}</span>
                </div>
                <span className="badge badge-muted">{notification.readAt ? "Read" : "Unread"}</span>
              </div>
            ))}
          </div>
          {!notifications.length && <div className="empty-state"><h3>You are all caught up.</h3><p>No operator notifications yet.</p></div>}
        </div>
      </section>
    </main>
  );
}
