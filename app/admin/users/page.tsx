import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminUsers() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Users</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Registered users.</h1>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name || "—"}</td>
                    <td className="muted" style={{ fontSize: "var(--text-sm)" }}>{item.email}</td>
                    <td><span className="badge badge-muted">{item.role}</span></td>
                    <td style={{ fontSize: "var(--text-sm)" }}>Active</td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{item.createdAt.toLocaleDateString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!users.length && <p className="muted" style={{ padding: "var(--space-4) 0" }}>No users yet.</p>}
        </div>
      </section>
    </main>
  );
}
