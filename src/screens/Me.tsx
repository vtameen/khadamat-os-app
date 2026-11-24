import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useSession } from '../session';
import { flush, queued, Queued } from '../outbox';
import { canUnlock, forgetThisPhone, lockAfterMinutes, rememberThisPhone, setLockAfterMinutes, setUnlockEnabled, unlockEnabled, unlockName } from '../device';
import { Caption, Group, IconSquare, Notice, Row, Section } from '../ui';
import { C, S, T } from '../theme';

const LOCKS = [1, 5, 15, 60];

export function Me() {
  const { user, logout } = useSession();
  const [items, setItems] = useState<Queued[]>([]);
  const [msg, setMsg] = useState('');
  const [unlockOn, setUnlockOn] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const [how, setHow] = useState('Face ID');
  const [lockMin, setLockMin] = useState(5);
  const [push, setPush] = useState<'on' | 'off' | ''>('');
  useEffect(() => {
    void queued().then(setItems);
    void (async () => {
      setHasLock(await canUnlock()); setUnlockOn(await unlockEnabled()); setHow(await unlockName()); setLockMin(await lockAfterMinutes());
      if (Platform.OS !== 'web') { try { setPush((await Notifications.getPermissionsAsync()).granted ? 'on' : 'off'); } catch { /* unknown */ } }
    })();
  }, []);
  const sync = async () => {
    const r = await flush();
    setMsg(r.refused.length ? 'Not accepted: ' + r.refused.join('; ') : r.left ? `Sent ${r.sent}. ${r.left} still waiting for signal.` : `All sent (${r.sent}).`);
    setItems(await queued());
  };
  const toggleUnlock = async (on: boolean) => {
    setUnlockOn(on); await setUnlockEnabled(on);
    if (on) await rememberThisPhone(); else await forgetThisPhone();
  };
  const initials = (user?.name ?? user?.username ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const signOut = () => {
    const go = () => void logout();
    if (Platform.OS === 'web') { go(); return; }
    Alert.alert('Sign out?', 'Next time you will need your password.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: go }]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}>
      <View style={{ alignItems: 'center', gap: S.s, marginTop: S.m }}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={[T.title2, { textAlign: 'center' }]} accessibilityRole="header">{user?.name ?? user?.username ?? 'Me'}</Text>
        <Text style={T.sub}>{[user?.username, user?.email].filter(Boolean).join(' · ')}</Text>
      </View>

      <Section title="Opening the app">
        <Group>
          <Row title={'Unlock with ' + how} sub={hasLock ? 'Instead of your password' : 'Set up a phone passcode first'} icon={<IconSquare name="faceid" color={C.teal} size={29} />}
            right={<Switch value={unlockOn && hasLock} disabled={!hasLock} onValueChange={(v) => void toggleUnlock(v)} trackColor={{ true: C.teal, false: '#E9E9EB' }} accessibilityLabel={'Unlock with ' + how} />} />
          <Row title="Ask again after" icon={<IconSquare name="lock" color={C.grey} size={29} />} chevron
            right={<Text style={[T.body, { color: C.muted }]}>{lockMin === 60 ? '1 hour' : lockMin + (lockMin === 1 ? ' minute' : ' minutes')}</Text>}
            onPress={async () => { const n = LOCKS[(LOCKS.indexOf(lockMin) + 1) % LOCKS.length]; setLockMin(n); await setLockAfterMinutes(n); }} />
        </Group>
      </Section>

      <Section title="Notifications">
        <Group>
          <Row title="Approvals and alerts" sub={push === 'off' ? 'Turned off in the phone settings' : 'Sent when something needs you'} icon={<IconSquare name="bell" color={C.red} size={29} />}
            right={<Text style={[T.body, { color: C.muted }]}>{push === 'on' ? 'On' : push === 'off' ? 'Off' : ''}</Text>} chevron={Platform.OS !== 'web'}
            onPress={Platform.OS !== 'web' ? () => void Linking.openSettings() : undefined} />
        </Group>
        <Caption style={{ marginTop: S.s, marginLeft: 16 }}>No alerts on Sundays. Sijil records are never sent as alerts.</Caption>
      </Section>

      <Section title="Saved on this phone">
        <Group>
          <Row title={items.length === 0 ? 'Nothing waiting to send' : items.length + ' waiting to send'} sub={items.slice(0, 3).map((q) => q.label).join(' · ') || undefined} />
          {items.length > 0 ? <Row title="Send now" onPress={() => void sync()} /> : null}
        </Group>
        {msg ? <View style={{ marginTop: S.s }}><Notice tone="info" text={msg} /></View> : null}
      </Section>

      <Group>
        <Row title="App version" right={<Text style={[T.body, { color: C.muted }]}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>} />
        <Row title="Sign out" danger onPress={signOut} />
      </Group>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120, width: '100%', maxWidth: 600, alignSelf: 'center' },
  avatar: { width: 89, height: 89, borderRadius: 45, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.teal, fontSize: 34, fontWeight: '700' },
});
