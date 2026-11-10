/**
 * Parses bracketed form names ("legs[0][from]", "inclusions") into nested objects/arrays.
 * Files and empty file inputs are skipped (handled separately via fd.getAll).
 */
export function nestedForm(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of fd.entries()) {
    if (rawKey.startsWith('$ACTION') || typeof value !== 'string') continue;
    const parts = rawKey.replace(/\]/g, '').split('[');
    let node: Record<string, unknown> | unknown[] = out;
    parts.forEach((part, i) => {
      const last = i === parts.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(parts[i + 1]!);
      const key: string | number = Array.isArray(node) ? Number(part) : part;
      const container = node as Record<string | number, unknown>;
      if (last) {
        container[key] = value;
      } else {
        container[key] ??= nextIsIndex ? [] : {};
        node = container[key] as Record<string, unknown> | unknown[];
      }
    });
  }
  return out;
}

export function files(fd: FormData, name: string): File[] {
  return fd.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}
