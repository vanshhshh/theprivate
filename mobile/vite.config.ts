import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

/**
 * Release builds may only talk to https://theprivate.in: the development hosts are removed from the
 * Content-Security-Policy, and the finished bundle is scanned for anything that looks like a secret.
 */
function releaseHardening(mode: string): Plugin {
  const dev = ['http://10.0.2.2:3000', 'http://localhost:3000'];
  const secretPatterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /rzp_(live|test)_[A-Za-z0-9]{8,}/, /postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/, /"private_key"\s*:/, /sk_(live|test)_[A-Za-z0-9]{10,}/, /AIza[0-9A-Za-z_-]{35}/];
  return {
    name: 'theprivate-release-hardening',
    transformIndexHtml(html) {
      if (mode !== 'production') return html;
      return dev.reduce((h, host) => h.split(` ${host}`).join(''), html);
    },
    generateBundle(_, bundle) {
      if (mode !== 'production') return;
      for (const [file, out] of Object.entries(bundle)) {
        const text = out.type === 'chunk' ? out.code : typeof out.source === 'string' ? out.source : '';
        for (const re of secretPatterns) if (re.test(text)) this.error(`Possible secret in ${file} (${re}). Release build refused.`);
        if (mode === 'production' && dev.some((h) => text.includes(h)) && file.endsWith('.js')) this.error(`Development host found in ${file}. Release build refused.`);
      }
    },
  };
}

// The app is bundled and served locally by Capacitor (https://localhost on Android,
// capacitor://localhost on iOS). It talks to the existing backend over HTTPS only.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), releaseHardening(mode)],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Native push only: the Firebase web SDK is never bundled (see src/native/firebase-web-stub.ts).
      'firebase/messaging': fileURLToPath(new URL('./src/native/firebase-web-stub.ts', import.meta.url)),
    },
  },
  build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5174, strictPort: true },
}));
