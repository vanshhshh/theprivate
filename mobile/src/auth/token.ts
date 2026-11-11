import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * The session token lives ONLY in the platform keystore:
 *   iOS     Keychain, this device only, available after first unlock, never synced to iCloud
 *   Android EncryptedSharedPreferences backed by the Android Keystore (excluded from backups)
 * In a desktop browser (development only) it is held in memory and lost on reload.
 */
const KEY = 'tp.session';
let memory: string | null = null;
let configured = false;

async function configure() {
  if (configured || !Capacitor.isNativePlatform()) return;
  await SecureStorage.setSynchronize(false);
  await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
  configured = true;
}

export async function readToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return memory;
  await configure();
  try {
    return await SecureStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string) {
  if (!Capacitor.isNativePlatform()) {
    memory = token;
    return;
  }
  await configure();
  await SecureStorage.setItem(KEY, token);
}

export async function clearToken() {
  memory = null;
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SecureStorage.removeItem(KEY);
  } catch {
    // Already gone.
  }
}
