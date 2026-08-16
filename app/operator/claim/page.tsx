"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClaimProfileCard, LuxuryButton } from "@/components/luxury";

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
    <main className="claimPage">
      <div className="shell">
        <div className="sectionHeading">
          <span>YOUR FLEET IS ALREADY HERE</span>
          <h1>Claim your operator profile.</h1>
          <p>We prepared this profile using public aviation information. Create access, verify the company, and review the fleet.</p>
        </div>

        {!operator ? (
          <div className="emptyState">
            <h2>Claim profile</h2>
            <p>{data?.error || message || "Loading..."}</p>
          </div>
        ) : (
          <ClaimProfileCard operator={operator}>
            <div className="authFields">
              <label>YOUR NAME<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>BUSINESS EMAIL<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label>PASSWORD<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              <LuxuryButton onClick={register}>CLAIM YOUR PROFILE</LuxuryButton>
              {message && <p className="notice">{message}</p>}
            </div>
          </ClaimProfileCard>
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
