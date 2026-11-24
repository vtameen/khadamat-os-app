import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ApiError, OfflineError } from '../api';
import { campLogin, campLogout, campMe, CampMe, campToday, CampToday, Checkpoint, position, qrCode, Slot, uploadPhoto, visitStart, visitSubmit } from '../camp';
import { Btn, Card, Chip, Label, Loading, Notice, Progress, Title } from '../ui';
import { C, Tone } from '../theme';

const msg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof OfflineError ? 'No signal. Try again when you have a connection.' : 'Something went wrong. Try again.');
const hhmm = (ts: number) => { const d = new Date(ts * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

/** Camp staff: the round is the whole app. No home screen, no module list. */
export function CampOps({ onExit }: { onExit: () => void }) {
  const [me, setMe] = useState<CampMe | null | 'out'>(null);
  const [camp, setCamp] = useState('');
  const [view, setView] = useState<'home' | 'scan'>('home');
  const [cp, setCp] = useState<Checkpoint | null>(null);

  const load = useCallback(async () => {
    try { const r = await campMe(); setMe(r); setCamp((c) => c || (r.camps[0]?.id ?? '')); }
    catch (e) { setMe(e instanceof ApiError ? 'out' : (p) => p ?? 'out'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (me === null) return <Loading />;
  if (me === 'out') return <CampLogin onDone={load} onExit={onExit} />;
  if (cp) return <Visit cp={cp} onClose={() => setCp(null)} />;
  if (view === 'scan') return <Scan onCancel={() => setView('home')} onFound={(c) => { setCp(c); setView('home'); }} />;
  return <CampHome me={me} camp={camp} setCamp={setCamp} onScan={() => setView('scan')}
    onSignOut={async () => { try { await campLogout(); } catch { /* signed out locally anyway */ } setMe('out'); }} />;
}

function CampLogin({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [mobile, setMobile] = useState(''); const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const go = async () => { setBusy(true); setError(''); try { await campLogin(mobile, pin); onDone(); } catch (e) { setError(msg(e)); } setBusy(false); };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.loginWrap} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 420, gap: 12 }}>
        <Text style={s.brand}>Camp staff</Text>
        <Text style={s.lead}>Sign in with your mobile number and PIN</Text>
        <Text style={s.fieldLabel}>Mobile number</Text>
        <TextInput accessibilityLabel="Mobile number" style={s.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <Text style={s.fieldLabel}>PIN</Text>
        <TextInput accessibilityLabel="PIN" style={s.input} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry onSubmitEditing={go} />
        {error ? <Notice text={error} tone="bad" /> : null}
        <Btn label={busy ? 'Signing in…' : 'Sign in'} onPress={go} disabled={busy || mobile.length < 9 || pin.length < 4} />
        <Btn label="Office staff sign-in" kind="plain" onPress={onExit} />
      </View>
    </ScrollView>
  );
}

function CampHome({ me, camp, setCamp, onScan, onSignOut }: {
  me: CampMe; camp: string; setCamp: (c: string) => void; onScan: () => void; onSignOut: () => void;
}) {
  const [data, setData] = useState<CampToday | null>(null);
  const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!camp) return; try { setData(await campToday(camp)); setError(''); } catch (e) { setError(msg(e)); } }, [camp]);
  useEffect(() => { setData(null); void load(); }, [load]);

  const slots = (data?.visits ?? []).filter((v) => v.state !== 'later' || v.start * 1000 - Date.now() < 3 * 3600 * 1000);
  const done = slots.filter((v) => v.state === 'done').length;
  const tone = (v: Slot): Tone => (v.state === 'done' ? 'ok' : v.state === 'missed' ? 'bad' : v.state === 'open' ? 'warn' : 'info');
  const text = (v: Slot) => (v.state === 'done' ? 'Done ' + hhmm((v as any).at || v.start) : v.state === 'missed' ? 'Missed' : v.state === 'open' ? 'Due now' : 'From ' + hhmm(v.start));
  const att = data?.camp.attendance; const tk = data?.camp.tickets;

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Title title={data?.camp.label ?? me.camps.find((c) => c.id === camp)?.label ?? 'Camp'} sub={me.user.name}
          right={<Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={s.pill}><Text style={s.pillText}>Sign out</Text></Pressable>} />
        {me.camps.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {me.camps.map((c) => <Pressable key={c.id} accessibilityRole="button" onPress={() => setCamp(c.id)} style={[s.pill, c.id === camp ? s.pillOn : null]}>
              <Text style={[s.pillText, c.id === camp ? { color: '#FFFFFF' } : null]}>{c.label}</Text></Pressable>)}
          </ScrollView>
        ) : null}
        {error ? <Notice text={error} tone="bad" /> : null}
        {data === null && !error ? <Loading /> : null}
        {data ? (
          <Card style={{ gap: 12 }}>
            <View style={s.between}><Text style={s.h}>Checkpoints</Text><Text style={s.sub}>{done + ' of ' + slots.length + ' done'}</Text></View>
            <Progress pct={slots.length ? (done / slots.length) * 100 : 0} />
            {slots.length === 0 ? <Text style={s.sub}>No checkpoints for you right now.</Text> : slots.map((v, i) => (
              <View key={v.cp + v.start + i} style={s.slot}><View style={{ flex: 1 }}><Text style={s.slotName}>{v.label}</Text>{v.slot ? <Text style={s.sub}>{v.slot}</Text> : null}</View><Chip label={text(v)} tone={tone(v)} /></View>
            ))}
          </Card>
        ) : null}
        {data ? (
          <View style={{ gap: 8 }}>
            <Label>Also today</Label>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={s.tile}><Text style={s.tileTitle}>Complaints</Text><Text style={s.sub}>{(tk?.live ?? 0) + ' open' + (tk?.overdue ? ' · ' + tk.overdue + ' late' : '')}</Text></View>
              <View style={s.tile}><Text style={s.tileTitle}>Camp staff</Text><Text style={s.sub}>{att && att.total ? att.marked + ' of ' + att.total + ' marked' : 'Attendance'}</Text></View>
              <View style={s.tile}><Text style={s.tileTitle}>Worker note</Text><Text style={s.sub}>For grading</Text></View>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ padding: 20, paddingTop: 8 }}><Btn label="Scan checkpoint QR" onPress={onScan} style={{ minHeight: 66, borderRadius: 20 }} /></View>
    </View>
  );
}

function Scan({ onFound, onCancel }: { onFound: (c: Checkpoint) => void; onCancel: () => void }) {
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [typed, setTyped] = useState('');
  const open = async (raw: string) => {
    if (busy) return;
    const code = qrCode(raw);
    if (!code) { setError('This is not a Camp Ops checkpoint code.'); return; }
    setBusy(true); setError('');
    try { onFound(await visitStart(code)); } catch (e) { setError(msg(e)); setBusy(false); }
  };
  useEffect(() => { if (Platform.OS !== 'web' && perm && !perm.granted && perm.canAskAgain) void ask(); }, [perm, ask]);
  const canScan = Platform.OS !== 'web' && !!perm?.granted;
  return (
    <View style={{ flex: 1, backgroundColor: C.ground, padding: 20, gap: 14 }}>
      <Title title="Scan checkpoint" sub="Point the camera at the sticker" right={<Pressable accessibilityRole="button" onPress={onCancel} style={s.pill}><Text style={s.pillText}>Cancel</Text></Pressable>} />
      {error ? <Notice text={error} tone="bad" /> : null}
      {canScan ? (
        <View style={s.camera}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={busy ? undefined : (r) => void open(r.data)} /></View>
      ) : <Notice text={Platform.OS === 'web' ? 'The camera scanner runs on the phone app.' : 'Allow the camera to scan, or type the code printed under the sticker.'} tone="info" />}
      <Text style={s.fieldLabel}>Or type the code under the sticker</Text>
      <TextInput accessibilityLabel="Checkpoint code" style={s.input} value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} />
      <Btn label={busy ? 'Opening…' : 'Open checkpoint'} onPress={() => void open(typed)} disabled={busy || typed.trim().length < 8} />
    </View>
  );
}

type Ans = { status?: 'ok' | 'issue'; note: string; photo: string };
function Visit({ cp, onClose }: { cp: Checkpoint; onClose: () => void }) {
  const [ans, setAns] = useState<Record<string, Ans>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const set = (id: string, patch: Partial<Ans>) => setAns((p) => ({ ...p, [id]: { ...(p[id] ?? { note: '', photo: '' }), ...patch } }));
  const allAnswered = cp.items.every((it) => ans[it.id]?.status);

  const takePhoto = async (id: string) => {
    setError('');
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Allow the camera to take the photo.'); return; }
      const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
      const a = r.canceled ? null : r.assets[0];
      if (!a || !a.base64) return;
      setBusy(true);
      const up = await uploadPhoto(cp.checkpoint.camp, 'data:image/jpeg;base64,' + a.base64, await position());
      set(id, { photo: up.id });
    } catch (e) { setError(msg(e)); }
    setBusy(false);
  };
  const submit = async () => {
    setError('');
    for (const it of cp.items) {
      const a = ans[it.id];
      if (a?.status === 'issue' && (a.note.trim().length < 3 || !a.photo)) { setError('Add a short note and a photo for: ' + it.label); return; }
    }
    setBusy(true);
    const pos = await position();
    if (!pos) { setBusy(false); setError('Turn on location (GPS) and try again. A visit only counts inside the camp.'); return; }
    try {
      await visitSubmit(cp.checkpoint.qr, cp.items.map((it) => ({ item: it.id, status: ans[it.id].status!, note: ans[it.id].note.trim(), photo: ans[it.id].photo })), pos);
      setSaved(true);
    } catch (e) { setError(msg(e)); }
    setBusy(false);
  };

  if (saved) return <View style={{ flex: 1, backgroundColor: C.ground, padding: 20, gap: 16, justifyContent: 'center' }}>
    <Text style={s.brand}>Saved</Text><Text style={s.lead}>{cp.checkpoint.label + ' is done.'}</Text><Btn label="Back to round" onPress={onClose} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Title title={cp.checkpoint.label} sub={cp.checkpoint.code} right={<Pressable accessibilityRole="button" onPress={onClose} style={s.pill}><Text style={s.pillText}>Cancel</Text></Pressable>} />
        {cp.items.map((it) => {
          const a = ans[it.id];
          return (
            <Card key={it.id} style={{ gap: 10 }}>
              <Text style={s.slotName}>{it.label}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn label="OK" kind={a?.status === 'ok' ? 'primary' : 'plain'} onPress={() => set(it.id, { status: 'ok' })} style={[s.choice, a?.status !== 'ok' ? s.choiceOff : null]} />
                <Btn label="Problem" kind="danger" onPress={() => set(it.id, { status: 'issue' })} style={[s.choice, a?.status === 'issue' ? { backgroundColor: C.coralTint } : null]} />
              </View>
              {a?.status === 'issue' ? (
                <>
                  <TextInput accessibilityLabel={'What is wrong: ' + it.label} placeholder="What is wrong?" placeholderTextColor={C.muted} style={[s.input, { backgroundColor: C.ground }]} value={a.note} onChangeText={(t) => set(it.id, { note: t })} />
                  <Btn label={a.photo ? 'Photo added · retake' : 'Take photo'} kind="plain" onPress={() => void takePhoto(it.id)} disabled={busy} style={{ backgroundColor: C.ground }} />
                </>
              ) : null}
            </Card>
          );
        })}
        {error ? <Notice text={error} tone="bad" /> : null}
      </ScrollView>
      <View style={{ padding: 20, paddingTop: 8 }}><Btn label={busy ? 'Saving…' : 'Save visit'} onPress={() => void submit()} disabled={busy || !allAnswered} style={{ minHeight: 66, borderRadius: 20 }} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  loginWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  brand: { fontSize: 30, fontWeight: '700', color: C.ink },
  lead: { fontSize: 15, color: C.muted, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.muted },
  input: { minHeight: 54, borderRadius: 16, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 16, color: C.ink },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.card, justifyContent: 'center' },
  pillOn: { backgroundColor: C.ink },
  pillText: { fontSize: 13, fontWeight: '600', color: C.ink },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h: { fontSize: 16, fontWeight: '600', color: C.ink },
  sub: { fontSize: 13, color: C.muted },
  slot: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotName: { fontSize: 15, fontWeight: '500', color: C.ink },
  tile: { flex: 1, minHeight: 92, borderRadius: 18, backgroundColor: C.card, padding: 12, justifyContent: 'space-between' },
  tileTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  camera: { flex: 1, minHeight: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000000' },
  choice: { flex: 1, minHeight: 56 },
  choiceOff: { backgroundColor: C.ground },
});
