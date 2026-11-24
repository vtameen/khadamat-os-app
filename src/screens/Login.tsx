import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSession } from '../session';
import { Btn, Notice, PrimaryButton } from '../ui';
import { C, R, S, T } from '../theme';

// First sign-in on a phone. The logo sits in the top 38% (golden split), the form below.
export function Login({ onCampStaff }: { onCampStaff: () => void }) {
  const { login, verify2fa } = useSession();
  const { height } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    const r = step === 'password' ? await login(username, password) : await verify2fa(code);
    setBusy(false);
    if (r.ok) return;
    if (r.need2fa === 'verify') { setStep('code'); return; }
    if (r.need2fa === 'setup') { setError('Two-step sign-in is not set up for this account yet. Set it up once on khadamatos.com, then sign in here.'); return; }
    setError(r.error ?? 'Sign-in failed');
  };
  const canGo = step === 'password' ? !!username && !!password : code.trim().length >= 6;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[s.top, { minHeight: Math.round(height * 0.382) }]}>
          <View style={s.logoBox}><Image source={require('../../assets/khadamat-logo.png')} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityLabel="Khadamat" /></View>
          <Text style={T.title} accessibilityRole="header">Khadamat OS</Text>
          <Text style={T.sub}>{step === 'password' ? 'Sign in once on this phone' : 'Enter the 6-digit code from your authenticator app'}</Text>
        </View>
        <View style={s.form}>
          <View style={s.group}>
            {step === 'password' ? (
              <>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Username</Text>
                  <TextInput accessibilityLabel="Username" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none"
                    autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="username" returnKeyType="next" placeholder="Username or email" placeholderTextColor={C.faint} />
                </View>
                <View style={[s.field, s.sep]}>
                  <Text style={s.fieldLabel}>Password</Text>
                  <TextInput accessibilityLabel="Password" style={s.input} value={password} onChangeText={setPassword} secureTextEntry
                    textContentType="password" autoComplete="password" onSubmitEditing={() => canGo && void submit()} placeholder="Required" placeholderTextColor={C.faint} />
                </View>
              </>
            ) : (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Code</Text>
                <TextInput accessibilityLabel="Authenticator code" style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad"
                  textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={10} onSubmitEditing={() => canGo && void submit()} placeholder="123 456" placeholderTextColor={C.faint} />
              </View>
            )}
          </View>
          {error ? <Notice text={error} tone="bad" icon="warn" /> : null}
          <PrimaryButton label={step === 'password' ? 'Sign in' : 'Verify'} onPress={() => void submit()} busy={busy} disabled={!canGo} />
          {step === 'code'
            ? <Btn label="Back" kind="text" onPress={() => { setStep('password'); setCode(''); setError(''); }} style={{ alignSelf: 'center' }} />
            : <Text style={[T.caption, { textAlign: 'center', paddingHorizontal: S.l }]}>After this, the app opens with Face ID, fingerprint or your phone's passcode. No password each time.</Text>}
        </View>
        <View style={{ flex: 1, minHeight: S.xl }} />
        <View style={{ paddingHorizontal: 20, paddingBottom: S.xl }}>
          <Btn label="Camp staff: mobile number and PIN" kind="plain" onPress={onCampStaff} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  top: { alignItems: 'center', justifyContent: 'flex-end', gap: S.m, paddingBottom: S.xl, paddingTop: S.xxl },
  logoBox: { width: 89, height: 89, borderRadius: R.card, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#103A42', shadowOpacity: 0.12, shadowRadius: 21, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  form: { paddingHorizontal: 20, gap: S.l, width: '100%', maxWidth: 480, alignSelf: 'center' },
  group: { backgroundColor: C.card, borderRadius: R.card, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', gap: S.m, paddingHorizontal: 16, minHeight: 55 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  fieldLabel: { ...T.body, width: 89 },
  input: { ...T.body, flex: 1, minHeight: 55, paddingVertical: 0 },
});
