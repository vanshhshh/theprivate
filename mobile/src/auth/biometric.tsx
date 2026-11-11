import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Plate, PLATES } from '@/components/Plate';
import { Button } from '@/components/ui';
import { useAuth } from './AuthProvider';

/**
 * Optional Face ID / Touch ID / fingerprint lock in front of an already signed-in session.
 * It protects access on this device only; it never replaces the server session or the password.
 * Locks on a cold start and after more than 5 minutes in the background.
 */
const KEY = 'tp.biometric.enabled';
const BACKGROUND_LIMIT_MS = 5 * 60_000;

export async function biometricAvailability(): Promise<{ available: boolean; label: string }> {
  if (!Capacitor.isNativePlatform()) return { available: false, label: 'Biometric lock' };
  try {
    const r = await BiometricAuth.checkBiometry();
    const label = Capacitor.getPlatform() === 'ios' ? (String(r.biometryType).toLowerCase().includes('face') ? 'Face ID' : 'Touch ID') : 'Fingerprint or face unlock';
    return { available: r.isAvailable || r.deviceIsSecure, label };
  } catch {
    return { available: false, label: 'Biometric lock' };
  }
}

export async function biometricEnabled() {
  return (await Preferences.get({ key: KEY })).value === '1';
}

/** Turning the lock on requires one successful check, so nobody locks themselves out by accident. */
export async function setBiometricEnabled(on: boolean) {
  if (on) await authenticate('Turn on the app lock');
  await Preferences.set({ key: KEY, value: on ? '1' : '0' });
}

async function authenticate(reason: string) {
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Cancel',
    allowDeviceCredential: true, // device passcode as fallback
    iosFallbackTitle: 'Use passcode',
    androidTitle: 'Unlock ThePrivate',
    androidSubtitle: reason,
    androidConfirmationRequired: false,
  });
}

function message(e: unknown) {
  const code = e instanceof BiometryError ? e.code : BiometryErrorType.none;
  if (code === BiometryErrorType.userCancel || code === BiometryErrorType.systemCancel || code === BiometryErrorType.appCancel) return null;
  if (code === BiometryErrorType.biometryLockout) return 'Biometric unlock is temporarily locked on this device. Unlock with your passcode, or sign out and sign in again.';
  if (code === BiometryErrorType.biometryNotEnrolled || code === BiometryErrorType.biometryNotAvailable || code === BiometryErrorType.passcodeNotSet) return 'This device has no biometrics or passcode set up any more. Sign out and sign in again.';
  return 'We could not confirm it’s you. Try again.';
}

export function BiometricGate({ children }: { children: ReactNode }) {
  const { state, signOut } = useAuth();
  const signedIn = state.status === 'signed-in';
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setError(null);
    try {
      await authenticate('Unlock ThePrivate');
      setLocked(false);
    } catch (e) {
      setError(message(e));
    } finally {
      prompting.current = false;
    }
  }, []);

  // Cold start: lock if enabled and a session exists.
  useEffect(() => {
    if (!signedIn || !Capacitor.isNativePlatform()) return;
    void biometricEnabled().then((on) => {
      if (on) {
        setLocked(true);
        void unlock();
      }
    });
  }, [signedIn, unlock]);

  // Background → foreground after the limit: lock again.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      if (away < BACKGROUND_LIMIT_MS || !signedIn) return;
      void biometricEnabled().then((on) => {
        if (on) {
          setLocked(true);
          void unlock();
        }
      });
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [signedIn, unlock]);

  if (!locked || !signedIn) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-night px-6 text-paper" style={{ paddingBottom: 'calc(var(--safe-bottom) + 40px)' }}>
      <Plate plate={PLATES.skyHorizon} priority />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/60 to-night/20" />
      <div className="relative">
        <p className="font-display text-[22px] leading-none">
          <span className="italic">The</span>Private<span className="ml-0.5 align-super text-[10px] text-magenta">●</span>
        </p>
        <h1 className="font-display mt-8 text-[40px] leading-none">Locked</h1>
        <p className="mt-3 text-[15px] text-paper/75">Unlock to see your journeys.</p>
        {error && <p role="alert" className="mt-4 text-[14px] text-dusk">{error}</p>}
        <div className="mt-8 flex flex-col gap-3">
          <Button variant="light" onClick={() => void unlock()} className="w-full">Unlock</Button>
          <Button variant="ghost" onClick={() => void signOut().then(() => setLocked(false))} className="w-full text-paper decoration-paper/40">Sign out instead</Button>
        </div>
      </div>
    </div>
  );
}
