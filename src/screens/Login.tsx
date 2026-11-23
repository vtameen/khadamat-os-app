import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '../session';
import { Btn, Notice } from '../ui';
import { C } from '../theme';

export function Login({ onCampStaff }: { onCampStaff: () => void }) {
  const { login, verify2fa } = useSession();
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View style={s.box}>
          <Text style={s.brand}>Khadamat OS</Text>
          <Text style={s.lead}>{step === 'password' ? 'Sign in with your Khadamat OS account' : 'Enter the 6-digit code from your authenticator app'}</Text>
          {step === 'password' ? (
            <>
              <Text style={s.fieldLabel}>Username or email</Text>
              <TextInput accessibilityLabel="Username or email" style={s.input} value={username} onChangeText={setUsername}
                autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
              <Text style={s.fieldLabel}>Password</Text>
              <TextInput accessibilityLabel="Password" style={s.input} value={password} onChangeText={setPassword}
                secureTextEntry textContentType="password" onSubmitEditing={submit} />
            </>
          ) : (
            <>
              <Text style={s.fieldLabel}>Code</Text>
              <TextInput accessibilityLabel="Authenticator code" style={s.input} value={code} onChangeText={setCode}
                keyboardType="number-pad" textContentType="oneTimeCode" onSubmitEditing={submit} />
            </>
          )}
          {error ? <Notice text={error} tone="bad" /> : null}
          <Btn label={busy ? 'Signing in…' : step === 'password' ? 'Sign in' : 'Verify'} onPress={submit}
            disabled={busy || (step === 'password' ? !username || !password : code.length < 6)} />
          {step === 'code' ? <Btn label="Back" kind="plain" onPress={() => { setStep('password'); setCode(''); setError(''); }} /> : null}
          <View style={s.rule} />
          <Btn label="Camp staff sign-in (PIN)" kind="plain" onPress={onCampStaff} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { width: '100%', maxWidth: 420, gap: 12 },
  brand: { fontSize: 30, fontWeight: '700', color: C.ink },
  lead: { fontSize: 15, color: C.muted, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.muted },
  input: { minHeight: 54, borderRadius: 16, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 16, color: C.ink },
  rule: { height: 1, backgroundColor: C.line, marginVertical: 8 },
});
