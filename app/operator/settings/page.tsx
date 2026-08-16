import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function OperatorSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");
  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="surface">
            <span className="microLabel">Settings</span>
            <h1>Operator settings.</h1>
            <p className="muted">Profile, pricing, fleet and availability controls are separated so sensitive regulatory data stays protected.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
