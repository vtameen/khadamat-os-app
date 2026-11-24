import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Registers this phone for push with the Khadamat OS push store.
// iPhone: the raw Apple token (platform "ios" → the server sends through Apple once
// apns.json is set up). Android: the Firebase token (platform "androidapp" → the
// server adds a visible notification, unlike the old Kotlin app's data-only ones).
// Never fatal: without push set up for the build it simply does nothing.
const LAST = 'khd.push.token';

export async function registerPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const cur = await Notifications.getPermissionsAsync();
    const granted = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;
    const tok = await Notifications.getDevicePushTokenAsync();
    const token = typeof tok.data === 'string' ? tok.data : '';
    if (!token) return;
    await api('/push/register', { token, platform: Platform.OS === 'ios' ? 'ios' : 'androidapp', device: Device.modelName ?? '' });
    await AsyncStorage.setItem(LAST, token);
  } catch { /* push is optional */ }
}
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(LAST);
    if (token) await api('/push/unregister', { token });
    await AsyncStorage.removeItem(LAST);
  } catch { /* best effort */ }
}
