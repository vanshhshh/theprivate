// Copies the licensed photography the app uses from the website's public/media into mobile/public.
// The website stays the single source of the media (and of its credits); phone-sized variants only.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '../../public/media');
const out = path.resolve(here, '../public/media');

const files = [
  'film/cabin-1280.webp',
  'film/sky-horizon-1280.webp',
  'film/sky-descent-1024.webp',
  'film/credits.json',
  'scenes/jet-inflight-960.webp',
  'scenes/jet-inflight-1600.webp',
  'scenes/jets-ramp-960.webp',
  'scenes/jets-ramp-1600.webp',
  'scenes/cabin-warm-960.webp',
  'scenes/cabin-warm-1600.webp',
  'scenes/cabin-aisle-960.webp',
  'scenes/window-light-960.webp',
];

let copied = 0;
for (const f of files) {
  const from = path.join(site, f);
  if (!existsSync(from)) throw new Error(`Missing website media: ${f}`);
  const to = path.join(out, f);
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied++;
}
console.log(`assets: ${copied} files synced from public/media`);
