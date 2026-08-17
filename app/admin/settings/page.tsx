import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminSettings() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Settings</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Admin settings.</h1>
            <p className="muted">Platform-wide settings, permissions, and integrations.</p>
          </div>
          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)" }}>
            <p className="muted" style={{ lineHeight: "var(--leading-relaxed)" }}>Additional admin settings will be added here. For now, use the dedicated pages for overview, operators, aircraft, claims, requests, quotes, bookings, users, availability, aviation, and audit.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
