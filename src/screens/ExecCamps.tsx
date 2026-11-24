import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, OfflineError } from '../api';
import { useLayout } from '../layout';
import { Brief, campTickets, ExecCamp, loadBrief, statusLabel, Ticket } from '../exec';
import { Icon } from '../icons';
import { BackLink, Caption, Empty, Group, LargeTitle, Loading, Notice, Pill, Progress, Row, Section } from '../ui';
import { C, NUM, R, S, T, Tone } from '../theme';

const ROUND: Record<string, { label: string; tone: Tone }> = {
  done: { label: 'Round done', tone: 'ok' }, late: { label: 'Round done late', tone: 'warn' }, overdue: { label: 'Round not done', tone: 'bad' },
  started: { label: 'Round started', tone: 'info' }, pending: { label: 'Round due', tone: 'info' },
};
const hhmm = (ts: number) => { const d = new Date(ts * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const ago = (ts: number) => { const h = Math.floor((Date.now() / 1000 - ts) / 3600); return h < 1 ? 'just now' : h < 48 ? h + ' h ago' : Math.floor(h / 24) + ' days ago'; };

/** Camp Ops for the Executive: every camp today, then one camp's open tickets. View only. */
export function ExecCamps({ openCamp, onOpened }: { openCamp?: string | null; onOpened?: () => void }) {
  const { split, listWidth } = useLayout();
  const [b, setB] = useState<Brief | null>(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<string | null>(openCamp ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setB(await loadBrief()); setError(''); }
    catch (e) { setError(e instanceof OfflineError ? 'No signal. Pull down to try again.' : e instanceof Error ? e.message : 'Could not load'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (openCamp) { setSel(openCamp); onOpened?.(); } }, [openCamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const camps = b?.camps?.camps ?? [];
  const camp = camps.find((c) => c.id === sel) ?? null;
  const list = (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle title="Camps" sub={b?.camps ? b.camps.totals.open + ' open tickets · ' + b.camps.totals.rounds + ' of ' + b.camps.totals.camps + ' morning rounds done' : undefined} />
      {error ? <Notice tone="bad" text={error} /> : null}
      {!b && !error ? <View style={{ height: 200 }}><Loading /></View> : null}
      {b && !b.camps ? <Empty icon="building" title="Camp Ops is not available" /> : null}
      {camps.map((c) => <CampCard key={c.id} c={c} on={split && sel === c.id} onPress={() => setSel(c.id)} />)}
      {camps.length ? <Caption style={{ textAlign: 'center' }}>View only. Tickets are handled by the camp team in Camp Ops.</Caption> : null}
    </ScrollView>
  );
  const detail = camp ? <CampDetail c={camp} onBack={() => setSel(null)} showBack={!split} /> : null;
  if (split) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.ground }}>
        <View style={{ width: listWidth, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line }}>{list}</View>
        <View style={{ flex: 1 }}>{detail ?? <Empty icon="building" title="Pick a camp" body="Its open tickets show here." />}</View>
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: C.ground }}>{detail ?? list}</View>;
}

function CampCard({ c, on, onPress }: { c: ExecCamp; on: boolean; onPress: () => void }) {
  const r = ROUND[c.round.state] ?? { label: statusLabel(c.round.state), tone: 'info' as Tone };
  const pct = c.att.total ? Math.round((c.att.marked * 100) / c.att.total) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.label + ', ' + c.tickets.live + ' open tickets, ' + r.label} onPress={onPress}
      style={({ pressed }) => [s.card, on ? s.cardOn : null, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={s.top}><Text style={T.section}>{c.label}</Text><Pill label={r.label} tone={r.tone} /></View>
      <View style={{ flexDirection: 'row', gap: S.m }}>
        <Fig v={String(c.tickets.live)} l="open" />
        <Fig v={String(c.tickets.overdue)} l="overdue" tone={c.tickets.overdue ? 'bad' : ''} />
        <Fig v={String(c.tickets.verify)} l="to verify" />
        <Fig v={c.att.total ? c.att.marked + '/' + c.att.total : '–'} l="attendance" tone={c.att.state === 'overdue' ? 'warn' : ''} />
      </View>
      {c.att.total ? <Progress pct={pct} color={c.att.state === 'overdue' ? C.amber : C.teal} /> : null}
      <View style={s.foot}><Text style={T.caption}>{c.lead}{c.round.by ? ' · round by ' + c.round.by : ''}{c.round.issues ? ' · ' + c.round.issues + ' issue' + (c.round.issues === 1 ? '' : 's') : ''}</Text><Icon name="chevron" size={14} color={C.faint} stroke={2.6} /></View>
    </Pressable>
  );
}
function Fig({ v, l, tone }: { v: string; l: string; tone?: Tone }) {
  return <View style={{ flex: 1 }}><Text style={[T.section, NUM, { color: tone === 'bad' ? C.red : tone === 'warn' ? C.amber : C.ink }]}>{v}</Text><Text style={T.caption} numberOfLines={1}>{l}</Text></View>;
}

function CampDetail({ c, onBack, showBack }: { c: ExecCamp; onBack: () => void; showBack: boolean }) {
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setRows(null); setError('');
    campTickets(c.id).then(setRows).catch((e) => { setRows([]); setError(e instanceof ApiError || e instanceof OfflineError ? e.message : 'Could not load the tickets'); });
  }, [c.id]);
  const overdue = (rows ?? []).filter((t) => t.overdue);
  const rest = (rows ?? []).filter((t) => !t.overdue);
  const item = (t: Ticket) => (
    <Row key={t.id} title={t.no + ' · ' + t.title}
      sub={[statusLabel(t.status), t.location, t.ownerName, 'raised ' + ago(t.createdTs), t.dueTs ? 'due ' + hhmm(t.dueTs) : ''].filter(Boolean).join(' · ')}
      right={<Pill label={statusLabel(t.priority || t.category)} tone={t.overdue ? 'bad' : t.priority === 'urgent' || t.priority === 'high' ? 'warn' : 'info'} />} />
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}>
      {showBack ? <BackLink label="Camps" onPress={onBack} /> : null}
      <LargeTitle title={c.label} sub={c.tickets.live + ' open · ' + c.tickets.overdue + ' overdue · ' + c.tickets.today + ' raised today'} />
      {error ? <Notice tone="bad" text={error} /> : null}
      {rows === null ? <View style={{ height: 160 }}><Loading /></View> : null}
      {overdue.length ? <Section title="Overdue"><Group>{overdue.map(item)}</Group></Section> : null}
      {rest.length ? <Section title={overdue.length ? 'Other open tickets' : 'Open tickets'}><Group>{rest.map(item)}</Group></Section> : null}
      {rows && rows.length === 0 && !error ? <View style={{ height: 220 }}><Empty icon="check" title="No open tickets" /></View> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: S.m, borderWidth: 2, borderColor: C.card },
  cardOn: { borderColor: C.teal },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.s },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: S.s, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
