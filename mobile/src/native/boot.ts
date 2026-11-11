import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Native start-up: light status-bar text over the cinematic dark surfaces, then reveal. */
export async function bootNative() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // Status bar styling is cosmetic; never block start-up on it.
  }
  // Hide the splash once the first frame has painted, so there is no white flash.
  requestAnimationFrame(() => requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 250 })));
}
