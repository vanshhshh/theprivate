import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/luxury";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="surface">
            <span className="microLabel">Settings</span>
            <h1>Account settings.</h1>
            <p className="muted">Security-sensitive profile changes are handled by support until self-service verification is enabled.</p>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button href="/profile">Profile</Button>
              <Button href="/trips" variant="light">Trips</Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
