import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LuxuryButton } from "@/components/luxury";

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
            <div className="actions">
              <LuxuryButton href="/profile">PROFILE</LuxuryButton>
              <LuxuryButton href="/trips" variant="light">TRIPS</LuxuryButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
