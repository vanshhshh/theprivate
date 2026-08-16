"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuxuryButton } from "@/components/luxury";
import { loungeImage } from "@/lib/media";

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submit() {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error || "Could not continue.");
      return;
    }
    if (json.role !== "ADMIN") {
      setMessage("Admin access required.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="authSplit">
      <div className="authVisual">
        <Image src={loungeImage} alt="Private aviation lounge" fill priority sizes="50vw" />
      </div>
      <section className="authPanel">
        <div className="authPanelInner">
          <div className="eyebrow">ADMIN</div>
          <h1>Marketplace access.</h1>
          <div className="authFields">
            <label>EMAIL<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>PASSWORD<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <LuxuryButton onClick={submit}>CONTINUE</LuxuryButton>
            {message && <p className="error">{message}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
