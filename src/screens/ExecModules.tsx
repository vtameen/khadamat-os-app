import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, OfflineError } from '../api';
import { aed, Brief, dmy, Glimpse, loadBrief, loadSummary, LpoRow, lpoList, ModuleDef, MODULES, PayReqRow, payreqList, SijilRow, statusLabel, statusTone } from '../exec';
import { BackLink, Caption, Empty, Group, IconSquare, LargeTitle, Loading, Notice, Pill, Row, Section, Segmented } from '../ui';
import { C, NUM, S, T, Tone } from '../theme';

const errText = (e: unknown) => (e instanceof OfflineError ? 'No signal. Pull down to try again.' : e instanceof ApiError ? e.message : 'Could not load');
const toTone = (t?: string): Tone => (t === 'bad' || t === 'warn' || t === 'ok' ? t : '');

/** Every module, one line each, the way the website's home sums it up. View only. */
export function ExecModules({ onOpenCamps, open, onOpen }: { onOpenCamps: () => void; open: ModuleDef['detail'] | null; onOpen: (d: ModuleDef['detail'] | null) => void }) {
  const [sum, setSum] = useState<Record<string, Glimpse> | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setSum(await loadSummary()); setError(''); } catch (e) { setError(errText(e)); setSum((p) => p ?? {}); } }, []);
  useEffect(() => { void load(); }, [load]);

  if (open === 'lpo') return <LpoList onBack={() => onOpen(null)} />;
  if (open === 'payreq') return <PayReqList onBack={() => onOpen(null)} />;
  if (open === 'sijil') return <SijilList onBack={() => onOpen(null)} />;

  // A module shows when the server sends its line, or when it has its own list screen.
  const shown = MODULES.filter((m) => (sum && sum[m.key]) || m.detail === 'lpo' || m.detail === 'payreq' || m.detail === 'camps');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle title="Modules" sub="Everything at a glance · view only" />
      {error ? <Notice tone="bad" text={error} /> : null}
      {sum === null ? <View style={{ height: 200 }}><Loading /></View> : (
        <Group>
          {shown.map((m) => {
            const g = sum[m.key];
            const go = m.detail === 'camps' ? onOpenCamps : m.detail ? () => onOpen(m.detail ?? null) : undefined;
            return (
              <Row key={m.key} title={m.label} sub={g?.l || (m.detail ? 'Open the list' : undefined)} chevron={!!go} onPress={go} minHeight={55}
                icon={<IconSquare name={m.icon} color={m.color} size={34} />}
                right={g?.v ? <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[T.bodyStrong, NUM, toTone(g.tone) === 'bad' ? { color: C.red } : toTone(g.tone) === 'warn' ? { color: C.amber } : null]}>{g.v}</Text>
                  {g.u ? <Text style={T.caption}>{g.u}</Text> : null}
                </View> : undefined} />
            );
          })}
        </Group>
      )}
      <Caption style={{ textAlign: 'center' }}>Figures update every minute. Changes are made in Khadamat OS by each module's team.</Caption>
    </ScrollView>
  );
}

function ListShell({ title, sub, onBack, error, loading, children, onRefresh, filter }: {
  title: string; sub?: string; onBack: () => void; error: string; loading: boolean; children: React.ReactNode; onRefresh: () => Promise<void>; filter?: React.ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} />}>
      <BackLink label="Modules" onPress={onBack} />
      <LargeTitle title={title} sub={sub} />
      {error ? <Notice tone="bad" text={error} /> : null}
      {filter}
      {loading ? <View style={{ height: 200 }}><Loading /></View> : children}
    </ScrollView>
  );
}

function LpoList({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<LpoRow[] | null>(null);
  const [error, setError] = useState('');
  const [f, setF] = useState<'open' | 'done' | 'all'>('open');
  const load = useCallback(async () => { try { setRows(await lpoList()); setError(''); } catch (e) { setError(errText(e)); setRows((p) => p ?? []); } }, []);
  useEffect(() => { void load(); }, [load]);
  const isOpen = (r: LpoRow) => r.status === 'pending' || r.status === 'returned';
  const shown = (rows ?? []).filter((r) => f === 'all' || (f === 'open' ? isOpen(r) : !isOpen(r))).slice(0, 150);
  const openN = (rows ?? []).filter(isOpen).length;
  return (
    <ListShell title="LPO Sign-off" sub={rows ? openN + ' in signing · ' + rows.length + ' in all' : undefined} onBack={onBack} error={error} loading={rows === null} onRefresh={load}
      filter={<Segmented items={[{ key: 'open', label: 'In signing' }, { key: 'done', label: 'Signed' }, { key: 'all', label: 'All' }]} value={f} onChange={setF} />}>
      {shown.length ? <Group>{shown.map((r) => (
        <Row key={r.id} title={r.lpoNo + ' · ' + r.supplier}
          sub={[aed(r.amount), r.unitLabel, r.status === 'pending' && r.curName ? 'with ' + r.curName : '', dmy(r.lpoDate)].filter(Boolean).join(' · ')}
          right={<Pill label={r.mine && r.status === 'pending' ? 'Your turn' : statusLabel(r.status)} tone={r.mine && r.status === 'pending' ? 'info' : statusTone(r.status)} />} />
      ))}</Group> : <View style={{ height: 220 }}><Empty icon="check" title="Nothing here" /></View>}
      <Caption style={{ textAlign: 'center' }}>LPOs waiting for you are signed from Approvals.</Caption>
    </ListShell>
  );
}

function PayReqList({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<PayReqRow[] | null>(null);
  const [error, setError] = useState('');
  const [f, setF] = useState<'open' | 'all'>('open');
  const load = useCallback(async () => { try { setRows(await payreqList()); setError(''); } catch (e) { setError(errText(e)); setRows((p) => p ?? []); } }, []);
  useEffect(() => { void load(); }, [load]);
  const isOpen = (r: PayReqRow) => ['submitted', 'sent', 'received', 'returned'].includes(r.status);
  const shown = (rows ?? []).filter((r) => f === 'all' || isOpen(r)).slice(0, 150);
  const total = useMemo(() => (rows ?? []).filter(isOpen).reduce((a, r) => a + r.total, 0), [rows]);
  return (
    <ListShell title="Payment Requests" sub={rows ? (rows.filter(isOpen).length + ' open · ' + aed(total)) : undefined} onBack={onBack} error={error} loading={rows === null} onRefresh={load}
      filter={<Segmented items={[{ key: 'open', label: 'Open' }, { key: 'all', label: 'All' }]} value={f} onChange={setF} />}>
      {shown.length ? <Group>{shown.map((r) => (
        <Row key={r.id} title={r.reqNo + (r.to ? ' · ' + r.to : '')}
          sub={[aed(r.total), r.subject, statusLabel(r.division), dmy(r.date)].filter(Boolean).join(' · ')}
          right={<Pill label={statusLabel(r.status)} tone={statusTone(r.status)} />} />
      ))}</Group> : <View style={{ height: 220 }}><Empty icon="check" title="Nothing open" /></View>}
      <Caption style={{ textAlign: 'center' }}>Requests waiting for your signature are signed from Approvals.</Caption>
    </ListShell>
  );
}

function SijilList({ onBack }: { onBack: () => void }) {
  const [b, setB] = useState<Brief | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { setB(await loadBrief()); setError(''); } catch (e) { setError(errText(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const rows = b?.sijil ?? [];
  const expired = rows.filter((r) => r.days < 0);
  const soon = rows.filter((r) => r.days >= 0);
  const row = (r: SijilRow) => (
    <Row key={r.id} title={r.title} sub={[r.party, r.camp, r.refNo, 'expires ' + dmy(r.expiry)].filter(Boolean).join(' · ')}
      right={<Pill label={r.days < 0 ? Math.abs(r.days) + 'd ago' : r.days === 0 ? 'Today' : 'in ' + r.days + 'd'} tone={r.days < 0 ? 'bad' : r.days <= 30 ? 'warn' : 'info'} />} />
  );
  return (
    <ListShell title="Sijil records" sub="Expired, or expiring within 60 days" onBack={onBack} error={error} loading={!b && !error} onRefresh={load}>
      {expired.length ? <Section title="Expired"><Group>{expired.map(row)}</Group></Section> : null}
      {soon.length ? <Section title="Coming up"><Group>{soon.map(row)}</Group></Section> : null}
      {b && !rows.length ? <View style={{ height: 220 }}><Empty icon="check" title="Nothing to renew" /></View> : null}
      <Caption style={{ textAlign: 'center' }}>Shown here only. Sijil sends you no reminders.</Caption>
    </ListShell>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
