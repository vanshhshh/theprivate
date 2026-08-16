"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuxuryButton } from "@/components/luxury";
import { heroImage } from "@/lib/media";

export default function OperatorLogin() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submit() {
    const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error || "Could not continue.");
      return;
    }
    router.push("/operator/dashboard");
  }

  return (
    <main className="authSplit">
      <div className="authVisual">
        <Image src={heroImage} alt="Private aircraft at dusk" fill priority sizes="50vw" />
      </div>
      <section className="authPanel">
        <div className="authPanelInner">
          <div className="eyebrow">OPERATOR ACCESS</div>
          <h1>{register ? "Create access." : "Manage your fleet."}</h1>
          <p className="muted">Review aircraft, pricing, availability and charter requests from one refined operating surface.</p>
          <div className="authFields">
            {register && <label>NAME<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
            <label>BUSINESS EMAIL<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>PASSWORD<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <LuxuryButton onClick={submit}>{register ? "CREATE ACCOUNT" : "CONTINUE"}</LuxuryButton>
            <button className="linkbtn" onClick={() => setRegister(!register)}>{register ? "Already have access?" : "Need access?"}</button>
            {message && <p className="error">{message}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
