"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuxuryButton } from "@/components/luxury";
import { loungeImage } from "@/lib/media";

export default function Login() {
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
    router.push(json.role === "ADMIN" ? "/admin" : json.role === "OPERATOR" ? "/operator/dashboard" : "/trips");
  }

  return (
    <main className="authSplit">
      <div className="authVisual">
        <Image src={loungeImage} alt="Private aviation lounge" fill priority sizes="50vw" />
      </div>
      <section className="authPanel">
        <div className="authPanelInner">
          <div className="eyebrow">THE PRIVATE</div>
          <h1>{register ? "Create account." : "Welcome back."}</h1>
          <div className="authFields">
            {register && <label>NAME<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
            <label>EMAIL<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>PASSWORD<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <LuxuryButton onClick={submit}>{register ? "CREATE ACCOUNT" : "CONTINUE"}</LuxuryButton>
            <button className="linkbtn" onClick={() => setRegister(!register)}>{register ? "Sign in instead" : "Create account"}</button>
            {message && <p className="error">{message}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
