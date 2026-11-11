import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App identity. `in.theprivate.app` mirrors the theprivate.in domain the business owns; it is
 * PROPOSED and must be confirmed before it is registered with Apple and Google (it cannot be
 * changed after the first store upload).
 */
const config: CapacitorConfig = {
  appId: 'in.theprivate.app',
  appName: 'ThePrivate',
  webDir: 'dist',
  // The bundled app is served from https://localhost (Android) / capacitor://localhost (iOS).
  server: { androidScheme: 'https', iosScheme: 'capacitor' },
  backgroundColor: '#0e1418',
  android: {
    // Local test builds only (CAP_LOCAL_DEV=1 npx cap sync android): lets the https://localhost app
    // reach the plain-HTTP development backend on the host (10.0.2.2) and enables WebView debugging.
    // Release builds are synced without it: no mixed content, no debugging.
    allowMixedContent: process.env.CAP_LOCAL_DEV === '1',
    captureInput: true,
    webContentsDebuggingEnabled: process.env.CAP_LOCAL_DEV === '1',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0e1418',
    // Re-enable with a WKAppBoundDomains list once it can be verified on an iPhone (see IOS_SETUP.md).
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0e1418',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: { overlaysWebView: true, style: 'DARK' },
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
};

export default config;
