import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { Button } from "@/components/luxury";
import { InviteButton } from "@/components/invite-button";

export default async function AdminOperatorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const operator = await db.operator.findUnique({
    where: { id },
    include: { aircraft: true, claims: { include: { user: true } }, bookings: true, availability: true, quotes: true },
  });
  if (!operator) notFound();

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ display: "grid", gap: "var(--space-6)", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, .85fr)" }}>
          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)" }}>
            <span className="eyebrow">Operator</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-5)" }}>{operator.name}</h1>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>DGCA ID</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.dgcaId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>AOP</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.aopNumber || "Not listed"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Email</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.email || "Not listed"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Status</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.active ? "Active" : "Suspended"} / {operator.verified ? "Verified" : "Unverified"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) 0" }}>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Claim</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{operator.claimed ? "Claimed" : "Unclaimed"}</span>
              </div>
            </div>
            <div style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button href={`/operator/${operator.id}`} variant="light">Public profile</Button>
              <Button href="/admin/operators" variant="ghost">All operators</Button>
              <InviteButton operatorId={operator.id} />
            </div>
          </div>
          <aside style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)" }}>
            <span className="eyebrow">Activity</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: "var(--line)", border: "var(--border)", marginTop: "var(--space-4)", marginBottom: "var(--space-5)" }}>
              <div style={{ background: "var(--white)", padding: "var(--space-4)" }}><span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase", display: "block", marginBottom: "var(--space-2)" }}>Aircraft</span><b style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{operator.aircraft.length}</b></div>
              <div style={{ background: "var(--white)", padding: "var(--space-4)" }}><span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase", display: "block", marginBottom: "var(--space-2)" }}>Claims</span><b style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{operator.claims.length}</b></div>
              <div style={{ background: "var(--white)", padding: "var(--space-4)" }}><span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase", display: "block", marginBottom: "var(--space-2)" }}>Bookings</span><b style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{operator.bookings.length}</b></div>
              <div style={{ background: "var(--white)", padding: "var(--space-4)" }}><span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase", display: "block", marginBottom: "var(--space-2)" }}>Listings</span><b style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>{operator.availability.length}</b></div>
            </div>
            <span className="eyebrow">Fleet</span>
            <div style={{ display: "grid", gap: 0, borderTop: "var(--border)", marginTop: "var(--space-3)" }}>
              {operator.aircraft.slice(0, 12).map((aircraft) => (
                <div key={aircraft.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                  <span>
                    <b style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{aircraft.registration}</b>
                    <small className="muted" style={{ marginLeft: "var(--space-2)" }}>{aircraft.model || aircraft.type || "Aircraft"}</small>
                  </span>
                  <span className="badge badge-muted">{aircraft.verified ? "Verified" : "Needs review"}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
