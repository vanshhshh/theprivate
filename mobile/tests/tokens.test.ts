import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// One brand: the app's colour tokens must match the website's (src/app/globals.css).
const colors = (file: string) =>
  Object.fromEntries([...readFileSync(file, 'utf8').matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{3,8})/gi)].map((m) => [m[1], m[2]!.toLowerCase()]));

describe('design tokens', () => {
  it('mirror the website palette exactly', () => {
    const site = colors(path.resolve(__dirname, '../../src/app/globals.css'));
    const app = colors(path.resolve(__dirname, '../src/styles/app.css'));
    expect(Object.keys(app).length).toBeGreaterThan(20);
    for (const [name, value] of Object.entries(app)) expect({ name, value }).toEqual({ name, value: site[name] });
  });
});
