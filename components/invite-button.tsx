"use client";

import { useState } from "react";
import { Button } from "@/components/luxury";

export function InviteButton({ operatorId }: { operatorId: string }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setUrl("");
    setCopied(false);
    try {
      const response = await fetch("/api/operator/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatorId }),
      });
      const json = await response.json();
      if (!response.ok) {
        alert(json.error || "Could not generate invite.");
        return;
      }
      setUrl(json.url);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-2)" }}>
      <Button variant="light" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate invite link"}</Button>
      {url && (
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", padding: "var(--space-3)", background: "var(--paper)", border: "var(--border)" }}>
          <code style={{ flex: 1, fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
              <Button variant="ghost" onClick={copy} className="btn-sm">{copied ? "Copied" : "Copy"}</Button>
        </div>
      )}
    </div>
  );
}
