import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../session';
import { unlockName } from '../device';
import { Icon } from '../icons';
import { Btn, Notice, tick } from '../ui';
import { C, S, T } from '../theme';

// Opening the app on a phone that is already signed in: the phone confirms it is
// the same person (Face ID, fingerprint or the phone's passcode). No password.
export function Unlock() {
  const { unlock, switchUser } = useSession();
  const [how, setHow] = useState<'Face ID' | 'fingerprint' | 'passcode'>('Face ID');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const asked = useRef(false);

  const go = async () => {
    if (busy) return;
    setBusy(true); setError('');
    const r = await unlock();
    setBusy(false);
    if (r.ok) { tick('success'); return; }
    if (r.error) { tick('warning'); setError(r.error); }
  };
  useEffect(() => {
    void unlockName().then(setHow);
    if (!asked.current) { asked.current = true; void go(); }   // ask straight away, like the lock screen does
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.wrap}>
      <View style={{ flex: 1.3 }} />
      <Image source={require('../../assets/khadamat-logo.png')} style={{ width: 55, height: 55 }} resizeMode="contain" accessibilityLabel="Khadamat" />
      <Text style={[T.title2, { textAlign: 'center', marginTop: S.l }]} accessibilityRole="header">Welcome back</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={'Unlock with ' + how} onPress={() => void go()}
        style={({ pressed }) => [s.face, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
        <Icon name={how === 'fingerprint' ? 'lock' : how === 'passcode' ? 'lock' : 'faceid'} size={55} color={C.teal} stroke={1.3} />
      </Pressable>
      <Text style={[T.sub, { marginTop: S.m }]}>{busy ? 'Checking…' : how === 'Face ID' ? 'Look at your phone to open' : 'Tap to open with your ' + how}</Text>
      {error ? <View style={{ marginTop: S.l, alignSelf: 'stretch' }}><Notice text={error} tone="bad" icon="warn" /></View> : null}
      <View style={{ flex: 2 }} />
      <Btn label="Not you? Sign in with a password" kind="text" onPress={() => void switchUser()} />
      <View style={{ height: S.xl }} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.ground, alignItems: 'center', paddingHorizontal: 20 },
  face: { marginTop: S.xxl, width: 89, height: 89, borderRadius: 24, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#103A42', shadowOpacity: 0.1, shadowRadius: 21, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
});
