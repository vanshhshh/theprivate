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
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0e1418',
    limitsNavigationsToAppBoundDomains: true,
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
