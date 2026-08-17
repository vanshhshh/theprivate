import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function OperatorPricingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect("/");

  const pricing = await db.operatorPricing.findUnique({ where: { operatorId: user.operatorId } });
  const aircraft = await db.aircraft.findMany({ where: { operatorId: user.operatorId, active: true }, select: { id: true, model: true, type: true, registration: true } });

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Pricing</span>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Operator pricing.</h1>
            <p className="muted">Configure your operating costs and minimums. Customers see only the final estimated price.</p>
          </div>

          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Default pricing</h3>
            <form action="/api/operator/pricing" method="POST" style={{ display: "grid", gap: "var(--space-4)" }}>
              <input type="hidden" name="operatorId" value={user.operatorId} />
              {[
                ["defaultHourlyRate", "Base hourly cost (INR)"],
                ["defaultMinHours", "Minimum billable hours"],
                ["domesticHandling", "Domestic handling (INR)"],
                ["internationalHandling", "International handling (INR)"],
                ["crewDaily", "Crew daily (INR)"],
                ["fuelSurchargePercent", "Fuel surcharge (%)"],
                ["operatorBuffer", "Operator buffer (INR)"],
                ["platformMarkupPercent", "Platform fee (%)"],
                ["minQuote", "Minimum acceptable price (INR)"],
              ].map(([name, label]) => (
                <label key={name} style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>{label}</span>
                  <input className="input" type="number" name={name} defaultValue={pricing ? Number(pricing[name as keyof typeof pricing] || 0) : 0} step="any" />
                </label>
              ))}
              <button type="submit" className="btn btn-dark">Save pricing</button>
            </form>
          </div>

          <div style={{ background: "var(--ink)", color: "var(--white)", padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>Preview</span>
            <div style={{ fontSize: "var(--text-lg)", fontFamily: "var(--serif)", fontWeight: 500 }}>Delhi to Dubai</div>
            <div style={{ fontSize: "var(--text-2xl)", fontFamily: "var(--serif)", fontWeight: 500 }}>Rs {previewPrice(pricing)}</div>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "var(--text-sm)" }}>Internal settings stay operator-only. Customers see a single estimated price.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function previewPrice(pricing: any) {
  const hourly = Number(pricing?.defaultHourlyRate || 0);
  const minHours = Math.max(2, Number(pricing?.defaultMinHours || 2));
  const base = hourly > 0 ? hourly * minHours : 1800000;
  const handling = Number(pricing?.internationalHandling || 0);
  const crew = Number(pricing?.crewDaily || 0);
  const buffer = Number(pricing?.operatorBuffer || 0);
  const subtotal = base + handling + crew + buffer;
  const markup = subtotal * (Number(pricing?.platformMarkupPercent || 8) / 100);
  return Math.ceil(Math.max(subtotal + markup, Number(pricing?.minQuote || 0)) / 1000) * 1000;
}
