import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminAudit() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const logs: any[] = [];

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Audit</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Activity log.</h1>
          </div>
          <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
            {logs.map((log: any) => (
              <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0", borderBottom: "var(--border-subtle)" }}>
                <div>
                  <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{log.action}</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{log.entityType} / {log.entityId}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-muted">{log.actor}</span>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{log.createdAt.toLocaleString("en-US")}</span>
                </div>
              </div>
            ))}
          </div>
          {!logs.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No audit activity yet.</p>}
        </div>
      </section>
    </main>
  );
}
