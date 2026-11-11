import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { env } from '@/config/env';
import { appPathFor } from '@/lib/links';

/**
 * Push notifications (FCM on Android; FCM over APNs on iOS). Switched on per build with
 * VITE_PUSH_ENABLED=true once google-services.json / GoogleService-Info.plist exist. Permission is
 * asked only when the customer chooses it (e.g. "Get notified when offers arrive"), never at launch.
 * Lock-screen text is generic; the app fetches details after it is opened.
 */
const TOKEN_KEY = 'tp.push.token';

export const pushConfigured = () => Capacitor.isNativePlatform() && import.meta.env.VITE_PUSH_ENABLED === 'true';

export async function pushPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
  if (!pushConfigured()) return 'unavailable';
  try {
    const p = await FirebaseMessaging.checkPermissions();
    return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unavailable';
  }
}

async function register() {
  if (Capacitor.getPlatform() === 'android') {
    await FirebaseMessaging.createChannel({ id: 'updates', name: 'Journey updates', description: 'Offers, booking updates and messages', importance: 4 }).catch(() => {});
  }
  const { token } = await FirebaseMessaging.getToken();
  await api('/api/mobile/v1/devices', { method: 'POST', body: { token, platform: Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID', appVersion: env.version } });
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

/** Asks the OS for permission (the customer just tapped "Turn on notifications"). */
export async function enablePush(): Promise<boolean> {
  if (!pushConfigured()) return false;
  const p = await FirebaseMessaging.requestPermissions();
  if (p.receive !== 'granted') return false;
  await register();
  return true;
}

/** Push off on this phone, or signing out: the server stops sending to this token. */
export async function disablePush() {
  if (!pushConfigured()) return;
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  if (value) await api('/api/mobile/v1/devices', { method: 'DELETE', body: { token: value } }).catch(() => {});
  await FirebaseMessaging.deleteToken().catch(() => {});
  await Preferences.remove({ key: TOKEN_KEY });
}

/** Keeps the token current and opens the right screen when a notification is tapped. */
export function PushBridge() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const signedIn = state.status === 'signed-in';

  useEffect(() => {
    if (!pushConfigured() || !signedIn) return;
    void pushPermission().then((p) => {
      if (p === 'granted') void register().catch(() => {});
    });
    const subs = [
      FirebaseMessaging.addListener('tokenReceived', () => void register().catch(() => {})),
      FirebaseMessaging.addListener('notificationActionPerformed', (e) => {
        const path = (e.notification.data as Record<string, string> | undefined)?.path;
        const target = path ? appPathFor(path) : null;
        navigate(target ?? '/inbox');
      }),
    ];
    return () => {
      subs.forEach((s) => void s.then((h) => h.remove()));
    };
  }, [signedIn, navigate]);

  return null;
}
