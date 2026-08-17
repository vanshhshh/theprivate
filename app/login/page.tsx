"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/luxury";
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
    <main className="auth-split">
      <div className="auth-visual">
        <Image src={loungeImage} alt="Private aviation lounge" fill priority sizes="50vw" />
      </div>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="eyebrow">The Private</span>
          <h1 style={{ fontSize: "clamp(36px, 4vw, 52px)", marginTop: "var(--space-3)" }}>{register ? "Create account." : "Welcome back."}</h1>
          <p className="muted" style={{ marginTop: "var(--space-2)", lineHeight: "var(--leading-relaxed)" }}>
            {register ? "Create your account to start searching and booking private flights." : "Sign in to access your trips and bookings."}
          </p>
          <div className="auth-fields">
            {register && (
              <label>
                Name
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="••••••••"
              />
            </label>
            <div style={{ marginTop: "var(--space-2)" }}>
              <Button onClick={submit}>{register ? "Create account" : "Continue"}</Button>
            </div>
            <button type="button" className="link-btn" onClick={() => setRegister(!register)}>
              {register ? "Already have an account? Sign in" : "Need an account? Create one"}
            </button>
            {message && <p style={{ color: "var(--error)", fontSize: "var(--text-sm)", fontWeight: 600 }}>{message}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
