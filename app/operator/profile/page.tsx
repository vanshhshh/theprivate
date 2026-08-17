import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function OperatorProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  const operator = await db.operator.findUnique({
    where: { id: user.operatorId },
    include: { aircraft: true, availability: true, bookings: true },
  });
  if (!operator) redirect("/operator/login");

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Operator profile</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>{operator.name}</h1>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-7)" }}>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Regulatory</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>DGCA ID</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.dgcaId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>AOP</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.aopNumber || "Not listed"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Email</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.email || "Not listed"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Phone</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.phone || "Not listed"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Status</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.verified ? "Verified" : "Pending verification"}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)" }}>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Readiness</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Fleet</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.aircraft.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Active</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.aircraft.filter((a: any) => a.active).length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Listings</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.availability.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Bookings</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.bookings.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
