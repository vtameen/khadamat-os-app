import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineError } from '../api';
import { useSession } from '../session';
import { useLayout } from '../layout';
import { Brief, dmy, loadBrief } from '../exec';
import { Icon } from '../icons';
import { Caption, Group, IconSquare, LargeTitle, Notice, Row, Section } from '../ui';
import { C, NUM, PHI, R, S, T, Tone } from '../theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Executive Today: what is his to sign, the camps at a glance, what needs his eye. View only. */
export function ExecToday({ onOpenApprovals, onOpenCamps, onOpenCamp, onOpenSijil, onOpenAlerts, onOpenMe }: {
  onOpenApprovals: () => void; onOpenCamps: () => void; onOpenCamp: (id: string) => void; onOpenSijil: () => void; onOpenAlerts: () => void; onOpenMe: () => void;
}) {
  const { user } = useSession();
  const { width, short } = useLayout();
  const [b, setB] = useState<Brief | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setB(await loadBrief()); setOffline(false); setError(''); }
    catch (e) { if (e instanceof OfflineError) setOffline(true); else setError(e instanceof Error ? e.message : 'Could not load'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const kicker = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
  // "Haneef", not "Muhammad": the sign-in name reads the way people call him; else the first name.
  const un = (user?.username ?? '').trim();
  const first = /^[a-z]{3,}$/i.test(un) ? un[0].toUpperCase() + un.slice(1).toLowerCase() : (user?.name ?? '').split(/\s+/)[0];
  const initials = (user?.name ?? user?.username ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const cardW = Math.min(width, 560) - 40;
  const cardH = Math.round(short ? cardW / (PHI * PHI) : cardW / PHI);
  const ts = b?.toSign;
  const parts = ts ? [[ts.lpo, 'LPO'], [ts.payreq, 'Payment'], [ts.docs, 'Documents'], [ts.materials, 'Materials']].filter(([n]) => (n as number) > 0) as Array<[number, string]> : [];
  const camps = b?.camps;
  const sijilSoon = (b?.sijil ?? []).filter((r) => r.days <= 30);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle kicker={kicker} title={first ? 'Good ' + (now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening') + ', ' + first : 'Today'} right={
        <View style={{ flexDirection: 'row', gap: S.s }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Alerts" onPress={onOpenAlerts} style={s.round}><Icon name="bell" size={22} color={C.teal} stroke={2} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Me" onPress={onOpenMe} style={s.round}><Text style={s.avatarText}>{initials}</Text></Pressable>
        </View>} />
      {offline ? <Notice icon="warn" text="No signal. Pull down to try again." /> : null}
      {error ? <Notice tone="bad" text={error} /> : null}

      {/* The one golden card: what is waiting for his signature. */}
      <Pressable accessibilityRole="button" accessibilityLabel={(ts?.total ?? 0) + ' to sign'} onPress={onOpenApprovals}
        style={({ pressed }) => [s.hero, { minHeight: cardH, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <Text style={[T.kicker, { color: C.onTealSoft }]}>To sign</Text>
        <Text style={[T.hero, NUM, { color: '#FFFFFF', marginTop: S.s }]}>{ts ? ts.total : '–'}<Text style={s.heroUnit}>{ts && ts.total === 0 ? ' all clear' : ' waiting'}</Text></Text>
        {parts.length ? <View style={s.chips}>{parts.map(([n, l]) => <View key={l} style={s.chip}><Text style={s.chipText}>{l} · {n}</Text></View>)}</View> : null}
        <View style={{ flex: 1, minHeight: S.m }} />
        <View style={s.heroBtn}><Text style={s.heroBtnText}>{ts && ts.total ? 'Review and sign' : 'Open approvals'}</Text></View>
      </Pressable>

      {camps ? (
        <Section title="Camps today">
          <Pressable accessibilityRole="button" onPress={onOpenCamps} style={({ pressed }) => [s.stats, pressed ? { opacity: 0.7 } : null]}>
            <Stat v={String(camps.totals.open)} l="open tickets" />
            <Stat v={String(camps.totals.overdue)} l="overdue" tone={camps.totals.overdue ? 'bad' : ''} />
            <Stat v={camps.totals.rounds + '/' + camps.totals.camps} l="morning rounds" tone={camps.totals.rounds < camps.totals.camps ? 'warn' : 'ok'} />
          </Pressable>
          {camps.needs.length ? (
            <Group style={{ marginTop: S.s }}>
              {camps.needs.slice(0, 5).map((n, i) => (
                <Row key={i} title={n.t} sub={n.s} chevron={!!n.camp} onPress={n.camp ? () => onOpenCamp(n.camp) : undefined}
                  icon={<View style={[s.dot, { backgroundColor: n.tone === 'bad' ? C.red : C.amber }]} />} />
              ))}
            </Group>
          ) : <Caption style={{ marginTop: S.s, marginLeft: 4 }}>Nothing needs your eye in the camps right now.</Caption>}
        </Section>
      ) : null}

      {/* Sijil stays quiet: shown here, never a notification (Ameen, 24 Nov 2026). */}
      {b && b.sijil.length ? (
        <View style={{ gap: S.s }}>
          <Group>
            <Row title="Records to renew" strong chevron onPress={onOpenSijil}
              sub={b.sijil.filter((r) => r.days < 0).length + ' expired · ' + sijilSoon.filter((r) => r.days >= 0).length + ' within 30 days'
                + (b.sijil[0] ? ' · next: ' + b.sijil[0].title + ' ' + dmy(b.sijil[0].expiry) : '')}
              icon={<IconSquare name="doc" color={C.grey} size={29} />} />
          </Group>
          <Caption style={{ marginLeft: 16 }}>From Sijil. Shown here only. No reminders are sent.</Caption>
        </View>
      ) : null}
    </ScrollView>
  );
}
function Stat({ v, l, tone }: { v: string; l: string; tone?: Tone }) {
  const color = tone === 'bad' ? C.red : tone === 'warn' ? C.amber : C.ink;
  return <View style={{ flex: 1, gap: 2 }}><Text style={[T.title2, NUM, { color }]}>{v}</Text><Text style={T.caption} numberOfLines={1}>{l}</Text></View>;
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120, width: '100%', maxWidth: 640, alignSelf: 'center' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.teal, fontWeight: '700', fontSize: 15 },
  hero: { backgroundColor: C.teal, borderRadius: R.card, padding: S.l },
  heroUnit: { fontSize: 21, fontWeight: '600', letterSpacing: -0.3, color: C.onTealSoft },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: R.chip, paddingHorizontal: S.l, paddingVertical: 11 },
  heroBtnText: { color: C.teal, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.s, marginTop: S.m },
  chip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: R.chip, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  stats: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: S.m },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
