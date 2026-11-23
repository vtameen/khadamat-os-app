import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

// Registers this phone for push with the existing Khadamat OS push store.
// Never fatal: without Firebase / Apple push set up for the build it simply does nothing.
export async function registerPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const cur = await Notifications.getPermissionsAsync();
    const granted = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;
    const tok = await Notifications.getDevicePushTokenAsync();
    const token = typeof tok.data === 'string' ? tok.data : '';
    if (!token) return;
    await api('/push/register', { token, platform: Platform.OS, device: Device.modelName ?? '' });
  } catch { /* push is optional */ }
}
