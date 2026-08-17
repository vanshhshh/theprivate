import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/luxury";
import { heroImage } from "@/lib/media";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-media">
          <Image src={heroImage} alt="Private jet on a quiet runway" fill priority sizes="100vw" />
        </div>
        <div className="hero-content">
          <div>
            <span className="hero-eyebrow">The Private</span>
            <h1 className="hero-title">Private aviation.<br />Without the friction.</h1>
            <p className="hero-subtitle">Search available aircraft, request a full charter, or ask us to source an aircraft for your route.</p>
          </div>
          <SearchPanel defaultFrom="Delhi" defaultTo="Dubai" />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">How it works</span>
            <h2>Choose how you want to fly.</h2>
            <p>Three ways to find your flight. All direct, all transparent.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)" }}>
            {[
              { label: "Empty legs", title: "Pick a ready route.", desc: "Confirmed empty-leg opportunities when they are available." },
              { label: "Whole charter", title: "Book the aircraft you need.", desc: "Choose your route, date and passengers, then request confirmation." },
              { label: "Quotation", title: "Ask us to source it.", desc: "If nothing fits, send one request and we will bring options back." },
            ].map((item) => (
              <div key={item.label} style={{ padding: "var(--space-6)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
                <span className="eyebrow">{item.label}</span>
                <h3 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>{item.title}</h3>
                <p className="muted" style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--ink)", color: "var(--white)", padding: "var(--space-9) 0" }}>
        <div className="shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, .6fr) minmax(280px, .4fr)", gap: "var(--space-7)", alignItems: "end" }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>Empty legs</span>
            <h2 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}>Fly a route already in motion.</h2>
            <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: 480, lineHeight: "var(--leading-relaxed)" }}>When an aircraft is available on your route, you can request it quickly and clearly.</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Link href="/search?emptyLeg=1" className="btn btn-light">View empty legs</Link>
            <Link href="/search?from=Delhi&to=Dubai&pax=6" className="btn btn-ghost" style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.2)" }}>Search all aircraft</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
