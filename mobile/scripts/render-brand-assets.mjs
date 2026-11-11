// Renders the app icon and splash sources from the real brand fonts (Newsreader) using a headless
// browser, into mobile/resources/. @capacitor/assets then generates every iOS/Android size.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobile = path.resolve(here, '..');
const out = path.join(mobile, 'resources');
mkdirSync(out, { recursive: true });

// Playwright is a dev dependency of the website workspace; reuse it rather than install it twice.
const rootRequire = createRequire(path.resolve(mobile, '../package.json'));
const pw = await import(pathToFileURL(rootRequire.resolve('@playwright/test')).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const font = (rel) => `data:font/woff2;base64,${readFileSync(path.join(mobile, 'node_modules', rel)).toString('base64')}`;
const NEWSREADER = font('@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2');
const NEWSREADER_I = font('@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2');

const css = `
@font-face { font-family: N; src: url(${NEWSREADER}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: N; src: url(${NEWSREADER_I}) format('woff2'); font-weight: 200 800; font-style: italic; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; }
body { display: grid; place-items: center; overflow: hidden; }
.night { background: radial-gradient(120% 70% at 50% 108%, #3a2a1c 0%, #1b1e20 38%, #0e1418 70%); }
.glow::after { content: ''; position: absolute; inset: auto 0 0 0; height: 30%; background: linear-gradient(to top, rgba(226,176,122,.16), transparent); }
.mark { position: relative; font-family: N; color: #f3f0e8; line-height: 1; }
.dot { position: absolute; border-radius: 50%; background: #a3245c; }
`;

const pages = {
  // Full-bleed iOS / legacy icon (1024²): the monogram "P" with the brand's magenta dot.
  'icon-only.png': { w: 1024, h: 1024, body: `<body class="night glow"><div class="mark" style="font-size:640px;font-weight:420;transform:translate(-14px,8px)">P<span class="dot" style="width:62px;height:62px;right:-64px;top:118px"></span></div></body>` },
  // Android adaptive foreground: transparent, monogram inside the 66 % safe zone.
  'icon-foreground.png': { w: 1024, h: 1024, transparent: true, body: `<body><div class="mark" style="font-size:430px;font-weight:420;transform:translate(-10px,6px)">P<span class="dot" style="width:42px;height:42px;right:-44px;top:80px"></span></div></body>` },
  'icon-background.png': { w: 1024, h: 1024, body: `<body class="night glow"></body>` },
  // Splash (2732²; centre-cropped on every device): the full wordmark.
  'splash.png': { w: 2732, h: 2732, body: `<body class="night"><div class="mark" style="font-size:190px;font-weight:400;letter-spacing:-1px"><i>The</i>Private<span class="dot" style="width:22px;height:22px;right:-30px;top:30px"></span></div></body>` },
  'splash-dark.png': { w: 2732, h: 2732, body: `<body class="night"><div class="mark" style="font-size:190px;font-weight:400;letter-spacing:-1px"><i>The</i>Private<span class="dot" style="width:22px;height:22px;right:-30px;top:30px"></span></div></body>` },
};

const browser = await chromium.launch();
for (const [file, p] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h } });
  await page.setContent(`<!doctype html><html><head><style>${css}${p.transparent ? 'html,body{background:transparent}' : ''}</style></head>${p.body}</html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, file), omitBackground: Boolean(p.transparent) });
  await page.close();
  console.log('rendered', file);
}
await browser.close();
