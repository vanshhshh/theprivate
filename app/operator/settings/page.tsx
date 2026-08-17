import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function OperatorSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Settings</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Operator settings.</h1>
            <p className="muted">Profile, pricing, fleet and availability controls are separated so sensitive regulatory data stays protected.</p>
          </div>
          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)" }}>
            <p className="muted" style={{ lineHeight: "var(--leading-relaxed)" }}>Additional operator settings will be added here. For now, use the dedicated pages for profile, pricing, fleet and availability.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
