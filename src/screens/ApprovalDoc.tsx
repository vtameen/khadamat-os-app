import React, { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ApiError, OfflineError } from '../api';
import { useSession } from '../session';
import {
  Approval, declineDoc, fetchFile, LpoDoc, lpoBoxName, lpoDecline, lpoFileUrl, lpoNext, loadLpo, loadPayReq, loadSignReq, mySignature,
  PayReq, payReqDecline, payreqFileUrl, signDoc, signFileUrl, signLpo, signPayReq, SignReq,
} from '../approvals';
import { pageSizes, pngAspect, Placement } from '../sign/stamp';
import { PdfView } from '../pdf';
import { Icon } from '../icons';
import { BackLink, BottomBar, Btn, Caption, Empty, Group, Loading, Notice, Pill, PrimaryButton, Row, tick } from '../ui';
import { C, NUM, R, S, T } from '../theme';

const msg = (e: unknown) => e instanceof ApiError ? e.message : e instanceof OfflineError ? 'No signal. Try again when you have a connection.' : e instanceof Error ? e.message : 'Something went wrong. Try again.';
const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (s?: string) => { const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + MON[+m[2] - 1] + '/' + m[1] : String(s ?? ''); };

/** One document waiting for this person. Opens natively; the decision buttons appear once it has opened. */
export function ApprovalDoc({ item, onClose, onDone }: { item: Approval; onClose: () => void; onDone: () => void }) {
  if (item.kind === 'lpo') return <LpoScreen id={item.id} onClose={onClose} onDone={onDone} />;
  if (item.kind === 'payreq') return <PayReqScreen id={item.id} onClose={onClose} onDone={onDone} />;
  return <SignDocScreen id={item.id} onClose={onClose} onDone={onDone} />;
}

// ── shared pieces ────────────────────────────────────────────────────────────
type FileTab = { key: string; label: string; path: string; name: string };
function useFile(tab: FileTab | null) {
  const [state, setState] = useState<{ key: string; uri?: string; bytes?: Uint8Array; error?: string } | null>(null);
  useEffect(() => {
    if (!tab) return;
    let live = true;
    setState({ key: tab.key });
    fetchFile(tab.path, tab.name).then((r) => live && setState({ key: tab.key, ...r }), (e) => live && setState({ key: tab.key, error: msg(e) }));
    return () => { live = false; };
  }, [tab?.key, tab?.path]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
function Tabs({ tabs, value, onChange }: { tabs: FileTab[]; value: string; onChange: (k: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.s, paddingHorizontal: 20 }} style={{ flexGrow: 0 }}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.key)}
            style={[st.tab, on ? { backgroundColor: C.ink } : null]}>
            <Text style={[st.tabText, on ? { color: '#FFFFFF' } : null]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
function Header({ back, kicker, title, sub, pill, onBack }: { back: string; kicker: string; title: string; sub?: string; pill?: React.ReactNode; onBack: () => void }) {
  return (
    <View style={{ paddingHorizontal: 20, gap: S.xs }}>
      <BackLink label={back} onPress={onBack} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.m }}>
        <View style={{ flex: 1 }}>
          <Text style={T.kicker} numberOfLines={1}>{kicker}</Text>
          <Text style={T.title2} numberOfLines={2} accessibilityRole="header">{title}</Text>
          {sub ? <Text style={[T.sub, NUM]} numberOfLines={2}>{sub}</Text> : null}
        </View>
        {pill}
      </View>
    </View>
  );
}
/** Bottom sheet: dims what is behind, slides up from the bottom and goes back the same way. */
function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(28,28,30,0.4)' }} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.grabber} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
/** "Why?" sheet for Send back / Reject / Ask for documents — a reason is required. */
function ReasonSheet({ open, title, sub, action, danger, onClose, onSend }: {
  open: boolean; title: string; sub: string; action: string; danger?: boolean; onClose: () => void; onSend: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (open) { setNote(''); setError(''); } }, [open]);
  return (
    <Sheet visible={open} onClose={onClose}>
      <Text style={T.title2}>{title}</Text>
      <Text style={T.sub}>{sub}</Text>
      <TextInput accessibilityLabel="Reason" value={note} onChangeText={setNote} multiline placeholder="What needs to change, or why" placeholderTextColor={C.faint}
        style={st.note} autoFocus />
      {error ? <Notice tone="bad" icon="warn" text={error} /> : null}
      <PrimaryButton label={action} busy={busy} disabled={!note.trim()} style={danger ? { backgroundColor: C.red } : undefined}
        onPress={async () => { setBusy(true); setError(''); try { await onSend(note.trim()); tick('success'); } catch (e) { setError(msg(e)); tick('warning'); } setBusy(false); }} />
      <Btn label="Cancel" kind="text" onPress={onClose} style={{ alignSelf: 'center' }} />
    </Sheet>
  );
}
function Done({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1400); return () => clearTimeout(t); }, [onDone]);
  return <View style={{ flex: 1, backgroundColor: C.ground, alignItems: 'center', justifyContent: 'center', gap: S.m }}>
    <View style={st.doneDot}><Icon name="check" size={34} color="#FFFFFF" stroke={2.6} /></View>
    <Text style={T.section}>{text}</Text>
  </View>;
}

// ── LPO ──────────────────────────────────────────────────────────────────────
function LpoScreen({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const { user } = useSession();
  const [d, setD] = useState<LpoDoc | null>(null);
  const [error, setError] = useState('');
  const [tabKey, setTabKey] = useState('main');
  const [mainOpened, setMainOpened] = useState(false);
  const [sheet, setSheet] = useState<'' | 'sign' | 'return' | 'reject'>('');
  const [finished, setFinished] = useState('');
  useEffect(() => { loadLpo(id).then(setD, (e) => setError(msg(e))); }, [id]);

  const tabs: FileTab[] = d ? [
    { key: 'main', label: 'LPO', path: lpoFileUrl(d.curFile, d.id), name: (d.lpoNo || 'LPO') + '.pdf' },
    ...(d.docs ?? []).map((x, i) => ({ key: 'd' + i, label: x.name.replace(/\.pdf$/i, ''), path: lpoFileUrl(x.f, d.id), name: x.name })),
  ] : [];
  const tab = tabs.find((t) => t.key === tabKey) ?? tabs[0] ?? null;
  const file = useFile(tab);
  const main = useFile(tabs[0] ?? null);   // the LPO itself is what gets signed
  if (finished) return <Done text={finished} onDone={onDone} />;
  if (error) return <View style={{ flex: 1, padding: 20, backgroundColor: C.ground }}><BackLink label="Approvals" onPress={onClose} /><Empty icon="warn" title="Could not open" body={error} /></View>;
  if (!d) return <Loading />;
  const mine = d.mine && d.status === 'pending' && !d.test;
  const next = lpoNext(d);

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ paddingTop: S.m, gap: S.m }}>
        <Header back="Approvals" onBack={onClose} kicker={'LPO' + (d.unitLabel ? ' · ' + d.unitLabel : '')} title={d.lpoNo || 'LPO'}
          sub={d.supplier + ' · AED ' + money(d.amount)} pill={mine ? <Pill label="Your turn" tone="warn" /> : <Pill label={d.status} tone="info" />} />
        <Tabs tabs={tabs} value={tab?.key ?? 'main'} onChange={setTabKey} />
      </View>
      <View style={{ flex: 1, marginTop: S.m, marginBottom: mine ? 150 : 0 }}>
        {file?.error ? <Empty icon="warn" title="Could not open the file" body={file.error} />
          : file?.uri ? <PdfView key={file.key} uri={file.uri} onLoaded={() => { if (file.key === 'main') setMainOpened(true); }} onError={(m) => setError(m)} />
          : <Loading />}
      </View>
      {mine ? (
        <BottomBar>
          {mainOpened ? <>
            <Caption style={{ textAlign: 'center', color: C.teal, fontWeight: '600' }}>{'Your signature goes in ' + lpoBoxName(d.cur) + (next ? ' · then ' + next.name : '')}</Caption>
            <View style={{ flexDirection: 'row', gap: S.s }}>
              <Btn label="Reject" kind="danger" onPress={() => setSheet('reject')} style={{ flex: 1, minHeight: 55, paddingHorizontal: 8 }} />
              <Btn label="Send back" kind="outline" onPress={() => setSheet('return')} style={{ flex: 1.3, minHeight: 55, paddingHorizontal: 8 }} />
              <PrimaryButton label="Sign" onPress={() => setSheet('sign')} disabled={!main?.bytes} style={{ flex: 1.2, paddingHorizontal: 8 }} />
            </View>
          </> : <Caption style={{ textAlign: 'center', paddingVertical: S.m }}>Opening the LPO… Sign appears once it is open.</Caption>}
        </BottomBar>
      ) : null}
      <SignSheet open={sheet === 'sign'} onClose={() => setSheet('')} title={'Sign ' + (d.lpoNo || 'this LPO') + '?'} sub={d.supplier + ' · AED ' + money(d.amount)}
        facts={[['Goes into box', lpoBoxName(d.cur)], ['Next to sign', next ? next.name + ' · email and WhatsApp' : 'Nobody — fully signed']]}
        onSign={async (sig, note) => { await signLpo(d, main!.bytes!, sig, user?.name ?? user?.username ?? '', note); setFinished('Signed'); }} />
      <ReasonSheet open={sheet === 'return'} onClose={() => setSheet('')} title="Send back to procurement" sub="It goes back to the procurement officer. Signing starts again from the beginning once it is fixed."
        action="Send back" onSend={async (n) => { await lpoDecline(d, 'return', n); setFinished('Sent back'); }} />
      <ReasonSheet open={sheet === 'reject'} danger onClose={() => setSheet('')} title={'Reject ' + (d.lpoNo || 'this LPO')} sub="The LPO is closed. The procurement officer is told why."
        action="Reject LPO" onSend={async (n) => { await lpoDecline(d, 'reject', n); setFinished('Rejected'); }} />
    </View>
  );
}

/** Confirm sheet: the saved signature, where it goes, who is next. No Face ID (Ameen, 24 Nov 2026). */
function SignSheet({ open, onClose, title, sub, facts, onSign, noteLabel = 'Note (optional)' }: {
  open: boolean; onClose: () => void; title: string; sub: string; facts: Array<[string, string]>; noteLabel?: string;
  onSign: (sig: Uint8Array, note: string) => Promise<void>;
}) {
  const { user } = useSession();
  const [sig, setSig] = useState<{ png: Uint8Array; dataUrl: string } | null | undefined>(undefined);
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!open) return; setNote(''); setError(''); mySignature().then(setSig, (e) => { setSig(null); setError(msg(e)); }); }, [open]);
  return (
    <Sheet visible={open} onClose={onClose}>
      <Text style={T.title2}>{title}</Text>
      <Text style={[T.sub, NUM]}>{sub}</Text>
      <View style={st.sigBox}>
        <Text style={T.kicker}>Your signature</Text>
        {sig === undefined ? <Loading /> : sig ? <Image source={{ uri: sig.dataUrl }} style={{ width: 200, height: 72, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel="Your saved signature" />
          : <Notice tone="warn" icon="warn" text="You have no saved signature yet. Save one once on khadamatos.com (Tasks › Signatures), or ask the admin to upload it." />}
        <Caption style={{ textAlign: 'center' }}>{(user?.name ?? '') + ' · today'}</Caption>
      </View>
      <View>{facts.map(([k, v], i) => <View key={k} style={[st.fact, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line } : null]}>
        <Text style={[T.body, { color: C.muted }]}>{k}</Text><Text style={[T.bodyStrong, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text></View>)}</View>
      <TextInput accessibilityLabel={noteLabel} value={note} onChangeText={setNote} placeholder={noteLabel} placeholderTextColor={C.faint} style={[st.note, { minHeight: 44 }]} />
      {error ? <Notice tone="bad" icon="warn" text={error} /> : null}
      <PrimaryButton label="Sign" busy={busy} disabled={!sig}
        onPress={async () => { if (!sig) return; setBusy(true); setError(''); try { await onSign(sig.png, note.trim()); tick('success'); } catch (e) { setError(msg(e)); tick('warning'); } setBusy(false); }} />
      <Btn label="Cancel" kind="text" onPress={onClose} style={{ alignSelf: 'center' }} />
    </Sheet>
  );
}

// ── Payment request ──────────────────────────────────────────────────────────
function PayReqScreen({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const { user } = useSession();
  const [r, setR] = useState<PayReq | null>(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<'' | 'sign' | 'return' | 'reject' | 'docs'>('');
  const [viewing, setViewing] = useState<FileTab | null>(null);
  const [finished, setFinished] = useState('');
  useEffect(() => { loadPayReq(id).then(setR, (e) => setError(msg(e))); }, [id]);
  if (finished) return <Done text={finished} onDone={onDone} />;
  if (error) return <View style={{ flex: 1, padding: 20, backgroundColor: C.ground }}><BackLink label="Approvals" onPress={onClose} /><Empty icon="warn" title="Could not open" body={error} /></View>;
  if (!r) return <Loading />;
  if (viewing) return <FileViewer tab={viewing} back={r.reqNo || 'Request'} onClose={() => setViewing(null)} />;
  const so = r.so ?? {};
  const mine = so.state === 'signing' && so.curUser === user?.id;
  const steps = so.steps ?? [];
  const signed = new Set((so.signs ?? []).map((x) => x.box));
  const myStep = steps[so.cur ?? -1];
  const nextStep = steps[(so.cur ?? -1) + 1];
  const payees = Array.from(new Set(r.lines.map((l) => l.chequeName).filter(Boolean)));

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: S.m, paddingBottom: mine ? 190 : 40, gap: S.l }}>
        <Header back="Approvals" onBack={onClose} kicker={'Payment request · ' + r.division + (r.site ? ' · ' + r.site : '')} title={r.reqNo || 'Payment request'}
          pill={mine ? <Pill label="Your turn" tone="warn" /> : undefined} />
        {/* Lead with the one number that matters. */}
        <View style={{ alignItems: 'center', gap: S.xs, paddingHorizontal: 20 }}>
          <Text style={[T.hero, NUM]}><Text style={{ fontSize: 21, fontWeight: '600', color: C.muted }}>AED </Text>{money(r.total)}</Text>
          <Text style={[T.sub, { textAlign: 'center' }]}>{(payees.join(', ') || '—') + ' · ' + dmy(r.date)}</Text>
          <View style={{ flexDirection: 'row', gap: S.s }}>{r.urgent ? <Pill label="Urgent" tone="bad" /> : null}{r.advance ? <Pill label="Advance" tone="warn" /> : null}</View>
        </View>
        <View style={{ paddingHorizontal: 20, gap: S.l }}>
          <Group>
            {r.lines.map((l, i) => (
              <Row key={i} title={l.desc || l.chequeName || 'Line ' + (i + 1)} sub={[l.chequeName, l.invNo ? 'Invoice ' + l.invNo : '', l.remarks].filter(Boolean).join(' · ')}
                right={<Text style={[T.bodyStrong, NUM]}>{money(l.amount)}</Text>} />
            ))}
            <Row title="Total" strong right={<Text style={[T.bodyStrong, NUM]}>{money(r.total)}</Text>} />
          </Group>
          {r.comments ? <Notice tone="info" text={r.comments} /> : null}
          {(r.files ?? []).length ? (
            <View style={{ gap: S.s }}>
              <Text style={[T.section, { marginLeft: 4 }]}>Documents</Text>
              <Group>{(r.files ?? []).map((f) => (
                <Row key={f.f} title={f.name} icon={<Icon name="doc" size={22} color={C.teal} />} chevron
                  onPress={() => setViewing({ key: f.f, label: f.name, path: payreqFileUrl(f.f, r.id), name: f.name })} />
              ))}</Group>
            </View>
          ) : null}
          {steps.length ? (
            <View style={{ gap: S.s }}>
              <Text style={[T.section, { marginLeft: 4 }]}>Signing order</Text>
              <Group>{steps.map((x, i) => {
                const done = signed.has(x.box); const now = i === so.cur;
                return <Row key={i} title={x.label} sub={x.name + (now && x.u === user?.id ? ' · you' : '')}
                  icon={<View style={[st.step, done ? { backgroundColor: C.tealTint } : now ? { backgroundColor: C.amberTint } : null]}>
                    {done ? <Icon name="check" size={16} color={C.teal} stroke={2.6} /> : <Text style={[T.caption, { fontWeight: '700', color: now ? C.amber : C.muted }]}>{i + 1}</Text>}</View>} />;
              })}</Group>
            </View>
          ) : null}
        </View>
      </ScrollView>
      {mine ? (
        <BottomBar>
          <View style={{ flexDirection: 'row', gap: S.s }}>
            <Btn label="Reject" kind="danger" onPress={() => setSheet('reject')} style={{ flex: 1, minHeight: 55, paddingHorizontal: 8 }} />
            <Btn label="Send back" kind="outline" onPress={() => setSheet('return')} style={{ flex: 1.3, minHeight: 55, paddingHorizontal: 8 }} />
            <PrimaryButton label="Sign" onPress={() => setSheet('sign')} style={{ flex: 1.2, paddingHorizontal: 8 }} />
          </View>
          <Btn label="Ask for more documents" kind="text" onPress={() => setSheet('docs')} style={{ alignSelf: 'center' }} />
        </BottomBar>
      ) : null}
      <SignSheet open={sheet === 'sign'} onClose={() => setSheet('')} title={'Sign ' + (r.reqNo || 'this request') + '?'} sub={'AED ' + money(r.total) + ' · ' + r.division}
        facts={[['Goes into box', myStep?.label ?? 'your box'], ['Next to sign', nextStep ? nextStep.name : 'Nobody — fully signed']]}
        onSign={async (_sig, note) => { await signPayReq(r, note); setFinished('Signed'); }} />
      <ReasonSheet open={sheet === 'return'} onClose={() => setSheet('')} title="Send back for correction" sub="It goes back to the preparer and the signatures so far are cleared."
        action="Send back" onSend={async (n) => { await payReqDecline(r, 'return', n); setFinished('Sent back'); }} />
      <ReasonSheet open={sheet === 'reject'} danger onClose={() => setSheet('')} title={'Reject ' + (r.reqNo || 'this request')} sub="The request is cancelled and the preparer is told why."
        action="Reject request" onSend={async (n) => { await payReqDecline(r, 'reject', n); setFinished('Rejected'); }} />
      <ReasonSheet open={sheet === 'docs'} onClose={() => setSheet('')} title="Ask for more documents" sub="The preparer adds them and it comes back to you. Signatures so far stay."
        action="Ask" onSend={async (n) => { await payReqDecline(r, 'docs', n); setFinished('Asked'); }} />
    </View>
  );
}
function FileViewer({ tab, back, onClose }: { tab: FileTab; back: string; onClose: () => void }) {
  const f = useFile(tab);
  return (
    <View style={{ flex: 1, backgroundColor: C.ground, paddingTop: S.m }}>
      <View style={{ paddingHorizontal: 20 }}><BackLink label={back} onPress={onClose} /><Text style={T.section} numberOfLines={2}>{tab.label}</Text></View>
      <View style={{ flex: 1, marginTop: S.m }}>
        {f?.error ? <Empty icon="warn" title="Could not open the file" body={f.error} /> : f?.uri ? <PdfView uri={f.uri} /> : <Loading />}
      </View>
    </View>
  );
}

// ── Tasks › Signatures: a PDF someone sent to this person ────────────────────
function SignDocScreen({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const { user } = useSession();
  const [r, setR] = useState<SignReq | null>(null);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [finished, setFinished] = useState('');
  useEffect(() => { loadSignReq(id).then(setR, (e) => setError(msg(e))); }, [id]);
  const tab = r ? { key: 'main', label: r.title, path: signFileUrl(r.file.stored, r.file.name), name: r.file.name } : null;
  const file = useFile(tab);
  if (finished) return <Done text={finished} onDone={onDone} />;
  if (error) return <View style={{ flex: 1, padding: 20, backgroundColor: C.ground }}><BackLink label="Approvals" onPress={onClose} /><Empty icon="warn" title="Could not open" body={error} /></View>;
  if (!r || !tab) return <Loading />;
  if (placing && file?.bytes && file.uri) {
    return <PlaceSignature bytes={file.bytes} uri={file.uri} title={r.title} onCancel={() => setPlacing(false)}
      onSign={async (pl, sig, addDate) => { await signDoc(r, file.bytes!, pl, sig, { id: user?.id ?? '', name: user?.name ?? user?.username ?? '' }, addDate); setFinished('Signed and returned'); }} />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ paddingTop: S.m }}><Header back="Approvals" onBack={onClose} kicker="Document to sign" title={r.title} sub={'From ' + r.senderName + (r.note ? ' · ' + r.note : '')} /></View>
      <View style={{ flex: 1, marginTop: S.m, marginBottom: 130 }}>
        {file?.error ? <Empty icon="warn" title="Could not open the file" body={file.error} /> : file?.uri ? <PdfView uri={file.uri} onLoaded={() => setOpened(true)} /> : <Loading />}
      </View>
      <BottomBar>
        {opened ? <View style={{ flexDirection: 'row', gap: S.s }}>
          <Btn label="Decline" kind="danger" onPress={() => setDeclining(true)} style={{ flex: 1, minHeight: 55 }} />
          <PrimaryButton label="Sign" icon="pen" onPress={() => setPlacing(true)} style={{ flex: 1.6 }} />
        </View> : <Caption style={{ textAlign: 'center', paddingVertical: S.m }}>Opening the document… Sign appears once it is open.</Caption>}
      </BottomBar>
      <ReasonSheet open={declining} danger onClose={() => setDeclining(false)} title="Decline to sign" sub={r.senderName + ' is told, with your reason.'}
        action="Decline" onSend={async (n) => { await declineDoc(r, n); setFinished('Declined'); }} />
    </View>
  );
}

/** Tap the page where the signature goes (tap a signature to remove it). Several pages allowed. */
function PlaceSignature({ bytes, uri, title, onCancel, onSign }: {
  bytes: Uint8Array; uri: string; title: string; onCancel: () => void; onSign: (pl: Placement[], sig: Uint8Array, addDate: boolean) => Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const [sizes, setSizes] = useState<Array<{ w: number; h: number }>>([]);
  const [page, setPage] = useState(0);
  const [pl, setPl] = useState<Placement[]>([]);
  const [sig, setSig] = useState<{ png: Uint8Array; dataUrl: string } | null | undefined>(undefined);
  const [addDate, setAddDate] = useState(true);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { pageSizes(bytes).then(setSizes, () => setError('Could not read the pages of this PDF.')); mySignature().then(setSig, (e) => { setSig(null); setError(msg(e)); }); }, [bytes]);
  const ps = sizes[page];
  const maxW = Math.min(width, 900) - 40, maxH = height - 330;
  const scale = ps ? Math.min(maxW / ps.w, maxH / ps.h) : 1;
  const aspect = sig ? pngAspect(sig.png) : 0.35;
  const W = 150, H = W * aspect;   // the website's default signature width (pt)
  const tap = useCallback((lx: number, ly: number) => {
    if (!ps) return;
    const x = lx / scale, yTop = ly / scale;
    setPl((p) => [...p, { page, x: Math.max(0, Math.min(ps.w - W, x - W / 2)), y: Math.max(0, Math.min(ps.h - H, ps.h - yTop - H / 2)), w: W, h: H }]);
    tick();
  }, [ps, scale, page, H]);

  return (
    <View style={{ flex: 1, backgroundColor: C.ground, paddingTop: S.m }}>
      <View style={{ paddingHorizontal: 20, gap: S.xs }}>
        <BackLink label="Document" onPress={onCancel} right={sizes.length > 1 ? <Text style={[T.caption, NUM]}>{'Page ' + (page + 1) + ' of ' + sizes.length}</Text> : null} />
        <Text style={T.section} numberOfLines={1}>{title}</Text>
        <Caption>Tap where your signature goes. Tap a signature to remove it.</Caption>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {ps ? (
          <View style={{ width: ps.w * scale, height: ps.h * scale, backgroundColor: '#FFFFFF', borderRadius: 4, overflow: 'hidden' }}>
            <PdfView key={'p' + page} uri={uri} page={page + 1} singlePage scrollEnabled={false} style={{ width: ps.w * scale, height: ps.h * scale, backgroundColor: '#FFFFFF' }} />
            <Pressable accessibilityLabel="Place your signature here" style={StyleSheet.absoluteFill} onPress={(e) => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
              {pl.map((p, i) => p.page !== page ? null : (
                <Pressable key={i} accessibilityLabel="Remove this signature" onPress={() => setPl((x) => x.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', left: p.x * scale, top: (ps.h - p.y - p.h) * scale, width: p.w * scale, height: p.h * scale, borderWidth: 1, borderColor: C.blue, borderStyle: 'dashed' }}>
                  {sig ? <Image source={{ uri: sig.dataUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
                </Pressable>
              ))}
            </Pressable>
          </View>
        ) : error ? <Notice tone="bad" icon="warn" text={error} /> : <Loading />}
      </View>
      <BottomBar>
        {sizes.length > 1 ? <View style={{ flexDirection: 'row', gap: S.s }}>
          <Btn label="Previous page" kind="plain" disabled={page === 0} onPress={() => setPage((p) => p - 1)} style={{ flex: 1 }} />
          <Btn label="Next page" kind="plain" disabled={page >= sizes.length - 1} onPress={() => setPage((p) => p + 1)} style={{ flex: 1 }} />
        </View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <Text style={T.body}>Date under signature</Text>
          <Switch value={addDate} onValueChange={setAddDate} trackColor={{ true: C.teal, false: '#E9E9EB' }} accessibilityLabel="Date under signature" />
        </View>
        {error && ps ? <Notice tone="bad" icon="warn" text={error} /> : null}
        <PrimaryButton label={pl.length ? 'Sign and return' : 'Tap the page first'} busy={busy} disabled={!pl.length || !sig}
          onPress={async () => { if (!sig) return; setBusy(true); setError(''); try { await onSign(pl, sig.png, addDate); tick('success'); } catch (e) { setError(msg(e)); tick('warning'); } setBusy(false); }} />
      </BottomBar>
    </View>
  );
}

const st = StyleSheet.create({
  tab: { minHeight: 36, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.card, justifyContent: 'center', maxWidth: 220 },
  tabText: { fontSize: 13, fontWeight: '600', color: C.ink },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: R.card, borderTopRightRadius: R.card, padding: 20, paddingBottom: S.xl, gap: S.m },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: S.xs },
  note: { ...T.body, minHeight: 89, borderRadius: R.inner, backgroundColor: C.ground, paddingHorizontal: 16, paddingVertical: S.m, textAlignVertical: 'top' },
  sigBox: { borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, borderRadius: R.inner, padding: S.m, gap: S.s },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: S.m, paddingVertical: 10 },
  step: { width: 29, height: 29, borderRadius: 15, backgroundColor: C.ground, alignItems: 'center', justifyContent: 'center' },
  doneDot: { width: 89, height: 89, borderRadius: 45, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
});
