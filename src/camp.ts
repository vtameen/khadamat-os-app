import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api } from './api';

// Camp field accounts (guards, camp boss, technicians): mobile number + PIN, tied to one phone.
// The phone is identified by a key made once on this device and kept in app storage.
const DEV_KEY = 'khd_camp_device_v1';
export async function deviceKey(): Promise<string> {
  let k = await AsyncStorage.getItem(DEV_KEY);
  if (!k || k.length < 16) {
    const hex = '0123456789abcdef'; k = '';
    for (let i = 0; i < 32; i++) k += hex[Math.floor(Math.random() * 16)];
    await AsyncStorage.setItem(DEV_KEY, k);
  }
  return k;
}
export type CampMe = { user: { id: string; name: string; roles: string[] }; camps: Array<{ id: string; code: string; label: string }> };
export type Slot = { cp: string; code: string; label: string; type: string; slot: string; state: 'done' | 'open' | 'missed' | 'later'; start: number; end: number; by: string; issues: number };
export type CampToday = {
  camp: { id: string; label: string; attendance?: { marked?: number; total?: number; state?: string }; tickets?: { live?: number; overdue?: number; verify?: number } };
  visits: Slot[];
};
export type Checkpoint = { checkpoint: { qr: string; label: string; code: string; type: string; camp: string }; items: Array<{ id: string; label: string }> };

export const campLogin = async (mobile: string, pin: string) => api('/campops/f/login', { mobile, pin, device: await deviceKey() });
export const campLogout = () => api('/campops/f/logout', {});
export const campMe = () => api<CampMe>('/campops/f/me');
export const campToday = (camp: string) => api<CampToday>('/campops/f/today?camp=' + encodeURIComponent(camp));
export const visitStart = (qr: string) => api<Checkpoint>('/campops/f/visit/start?qr=' + encodeURIComponent(qr));
export const uploadPhoto = (camp: string, dataUrl: string, pos: Pos | null) =>
  api<{ id: string }>('/campops/f/photo', { camp, data: dataUrl, lat: pos?.lat, lng: pos?.lng, acc: pos?.acc });
export const visitSubmit = (qr: string, results: Array<{ item: string; status: 'ok' | 'issue'; note?: string; photo?: string }>, pos: Pos) =>
  api<any>('/campops/f/visit', { qr, results, lat: pos.lat, lng: pos.lng, acc: pos.acc });

/** A checkpoint sticker holds a short code, alone or inside a link. */
export function qrCode(scanned: string): string | null {
  const m = scanned.toLowerCase().match(/[a-f0-9]{8,16}/g);
  return m && m.length ? m[m.length - 1] : null;
}
export type Pos = { lat: number; lng: number; acc: number | null };
/** The server only accepts a visit made inside the camp, so a position is required. */
export async function position(): Promise<Pos | null> {
  try {
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return null;
    const l = await Location.getCurrentPositionAsync({});
    return { lat: l.coords.latitude, lng: l.coords.longitude, acc: l.coords.accuracy ?? null };
  } catch { return null; }
}
