"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/luxury";

function ClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    let alive = true;
    if (!token) {
      setMessage("Claim invitation token required.");
      return;
    }
    fetch(`/api/claim/token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (alive) setData(json);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function register() {
    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const registerJson = await registerResponse.json();
    if (!registerResponse.ok) {
      setMessage(registerJson.error);
      return;
    }

    const claimResponse = await fetch("/api/claim/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const claimJson = await claimResponse.json();
    setMessage(claimResponse.ok ? "Claim submitted for admin verification." : claimJson.error || "Could not submit claim.");
    if (claimResponse.ok) router.push("/operator/dashboard");
  }

  const operator = data?.operator;
  return (
    <main style={{ minHeight: "100svh", display: "grid", alignItems: "center", padding: "var(--space-8) 0" }}>
      <div className="shell" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
          <span className="eyebrow">Your fleet is already here</span>
          <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>Claim your operator profile.</h1>
          <p className="muted" style={{ maxWidth: 480, margin: "0 auto", lineHeight: "var(--leading-relaxed)" }}>We prepared this profile using public aviation information. Create access, verify the company, and review the fleet.</p>
        </div>

        {!operator ? (
          <div className="empty-state">
            <h3>Claim profile</h3>
            <p>{data?.error || message || "Loading..."}</p>
          </div>
        ) : (
          <div style={{ background: "var(--white)", border: "var(--border)", padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <div style={{ display: "grid", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
              <div>
                <span className="eyebrow">Operator</span>
                <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-1)" }}>{operator.name}</h3>
                <p className="muted" style={{ fontSize: "var(--text-sm)" }}>{operator.aircraft.length} aircraft preloaded from aviation records.</p>
              </div>
              <div style={{ borderTop: "var(--border)", display: "grid", gap: 0, marginTop: "var(--space-3)" }}>
                {operator.aircraft.slice(0, 5).map((aircraft: any) => (
                  <div key={aircraft.id || aircraft.registration} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-3) 0", borderBottom: "var(--border-subtle)" }}>
                    <span>
                      <b style={{ fontSize: "var(--text-sm)" }}>{aircraft.model || aircraft.type || "Aircraft"}</b>
                      <small className="muted" style={{ marginLeft: "var(--space-2)" }}>{aircraft.registration}</small>
                    </span>
                    <strong style={{ color: "var(--accent-dark)", fontFamily: "var(--serif)" }}>{aircraft.seats || "-"} seats</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "var(--space-3)", maxWidth: 400 }}>
              <label style={{ display: "grid", gap: "var(--space-1)" }}>
                <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Your name</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label style={{ display: "grid", gap: "var(--space-1)" }}>
                <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Business email</span>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label style={{ display: "grid", gap: "var(--space-1)" }}>
                <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Password</span>
                <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <Button onClick={register}>Claim your profile</Button>
              {message && <p style={{ color: "var(--accent-dark)", fontWeight: 700, fontSize: "var(--text-sm)" }}>{message}</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Claim() {
  return (
    <Suspense fallback={<main><div className="shell section">Loading...</div></main>}>
      <ClaimContent />
    </Suspense>
  );
}
