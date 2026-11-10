import { createHash } from 'node:crypto';

/** Deterministic JSON: object keys sorted recursively so the hash depends only on content. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** The approval token for `import:apply`. Covers source file hashes and every planned change. */
export function planHash(plan: unknown): string {
  return sha256Hex(canonicalJson(plan));
}

/** Stable per-record content hash used for idempotent re-imports. */
export function contentHash(value: unknown): string {
  return sha256Hex(canonicalJson(value)).slice(0, 32);
}
