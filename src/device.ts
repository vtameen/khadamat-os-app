import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// "Sign in once on this phone" (Ameen, 24 Nov 2026). After the password (and the
// authenticator code where needed) the server hands this phone a key, kept in the
// iOS Keychain / Android Keystore. Opening the app later asks the phone itself —
// Face ID, fingerprint or the phone's passcode — and only then sends the key back
// for a fresh session (/api/app/device/resume). The password is not stored anywhere.
const KEY = 'khd.device.key';
const PREF = 'khd.unlock.enabled';
const LOCK_AFTER = 'khd.unlock.after';
const native = Platform.OS === 'ios' || Platform.OS === 'android';
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function storedKey(): Promise<string | null> {
  if (!native) return null;
  try { return await SecureStore.getItemAsync(KEY, opts); } catch { return null; }
}
async function saveKey(k: string) { if (native) await SecureStore.setItemAsync(KEY, k, opts); }
export async function dropKey(): Promise<void> { if (native) { try { await SecureStore.deleteItemAsync(KEY, opts); } catch { /* already gone */ } } }

/** Has the person set up any phone lock (face, fingerprint or passcode)? */
export async function canUnlock(): Promise<boolean> {
  if (!native) return false;
  try { return (await LocalAuthentication.getEnrolledLevelAsync()) >= LocalAuthentication.SecurityLevel.SECRET; } catch { return false; }
}
/** What to call the phone's unlock in the UI. */
export async function unlockName(): Promise<'Face ID' | 'fingerprint' | 'passcode'> {
  try {
    const t = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (t.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (t.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  } catch { /* fall through */ }
  return 'passcode';
}
export async function unlockEnabled(): Promise<boolean> {
  if (!native) return false;
  return (await AsyncStorage.getItem(PREF)) !== 'off';
}
export async function setUnlockEnabled(on: boolean): Promise<void> { await AsyncStorage.setItem(PREF, on ? 'on' : 'off'); }
/** Minutes in the background before the app asks again (default 5). */
export async function lockAfterMinutes(): Promise<number> {
  const v = Number(await AsyncStorage.getItem(LOCK_AFTER)); return Number.isFinite(v) && v > 0 ? v : 5;
}
export async function setLockAfterMinutes(m: number): Promise<void> { await AsyncStorage.setItem(LOCK_AFTER, String(m)); }

/** After a password sign-in: ask the server for this phone's key and keep it. Never fatal. */
export async function rememberThisPhone(): Promise<boolean> {
  try {
    if (!(await unlockEnabled()) || !(await canUnlock())) return false;
    const r = await api<{ token: string }>('/app/device/register', { name: Device.modelName ?? 'Phone', platform: Platform.OS });
    if (!r?.token) return false;
    await saveKey(r.token);
    return true;
  } catch { return false; }
}
/** Ask the phone (Face ID / fingerprint / passcode). True when the person is confirmed. */
export async function askPhone(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Open Khadamat OS', cancelLabel: 'Cancel', disableDeviceFallback: false });
    if (r.success) return { ok: true };
    const e = r.error;
    return { ok: false, cancelled: e === 'user_cancel' || e === 'system_cancel' || e === 'app_cancel', error: e };
  } catch { return { ok: false, error: 'unknown' }; }
}
/** Forget this phone on the server (when signed in) and locally. */
export async function forgetThisPhone(): Promise<void> {
  const k = await storedKey();
  if (k) { try { await api('/app/device/forget', { token: k }); } catch { /* offline: the key is dropped here anyway */ } }
  await dropKey();
}
