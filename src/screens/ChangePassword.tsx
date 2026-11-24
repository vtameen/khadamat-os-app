import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, OfflineError } from '../api';
import { useSession } from '../session';
import { Btn, LargeTitle, Notice, PrimaryButton } from '../ui';
import { C, R, S, T } from '../theme';

// First sign-in with a temporary password: choose your own before anything else.
export function ChangePassword() {
  const { refresh, logout } = useSession();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const go = async () => {
    if (pw !== pw2) { setError('The two passwords are not the same.'); return; }
    setBusy(true); setError('');
    try { await api('/change-password', { currentPassword: '', newPassword: pw }); await refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.message : e instanceof OfflineError ? 'No connection. Try again when you have signal.' : 'Could not save. Try again.'); }
    setBusy(false);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: S.xxl, gap: S.l }} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Choose your password" sub="You signed in with a temporary password. Pick your own to carry on (at least 8 characters)." />
        <View style={s.group}>
          <TextInput accessibilityLabel="New password" style={s.input} value={pw} onChangeText={setPw} secureTextEntry textContentType="newPassword" placeholder="New password" placeholderTextColor={C.faint} />
          <View style={s.sep} />
          <TextInput accessibilityLabel="New password again" style={s.input} value={pw2} onChangeText={setPw2} secureTextEntry textContentType="newPassword" placeholder="Same again" placeholderTextColor={C.faint} />
        </View>
        {error ? <Notice text={error} tone="bad" icon="warn" /> : null}
        <PrimaryButton label="Save password" onPress={() => void go()} busy={busy} disabled={pw.length < 8 || !pw2} />
        <Btn label="Sign out" kind="text" onPress={() => void logout()} style={{ alignSelf: 'center' }} />
        <Text style={[T.caption, { textAlign: 'center' }]}>Your temporary password works once, for 24 hours.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  group: { backgroundColor: C.card, borderRadius: R.card, overflow: 'hidden' },
  input: { ...T.body, minHeight: 55, paddingHorizontal: 16 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 16 },
});
