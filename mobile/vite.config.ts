import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// The app is bundled and served locally by Capacitor (https://localhost on Android,
// capacitor://localhost on iOS). It talks to the existing backend over HTTPS only.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
