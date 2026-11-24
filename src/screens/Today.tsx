import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, OfflineError } from '../api';
import { useSession } from '../session';
import { Job, seesSijil } from '../jobs';
import { Approval, loadApprovals } from '../approvals';
import { useLayout } from '../layout';
import { Icon } from '../icons';
import { Caption, Group, IconSquare, LargeTitle, Notice, Pill, Progress, Row, Section } from '../ui';
import { C, NUM, PHI, R, S, T } from '../theme';

type Glimpse = { v?: string; u?: string; l?: string; tone?: string; pct?: number } | null;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Today({ jobs, onOpenJob, onOpenApproval, onOpenApprovals, onOpenMe, queuedCount }: {
  jobs: Job[]; onOpenJob: (j: Job) => void; onOpenApproval: (a: Approval) => void; onOpenApprovals: () => void; onOpenMe: () => void; queuedCount: number;
}) {
  const { user } = useSession();
  const { width, short } = useLayout();
  const [waiting, setWaiting] = useState<Approval[] | null>(null);
  const [sum, setSum] = useState<Record<string, Glimpse>>({});
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, hs] = await Promise.all([
        loadApprovals(user?.id ?? ''),
        // The server sends {summary: {...}, date, ts}; the module lines are inside summary.
        api<any>('/home-summary').then((r) => (r && typeof r.summary === 'object' && r.summary) || r || {}).catch((e) => { if (e instanceof OfflineError) throw e; return {}; }),
      ]);
      setWaiting(a); setSum(hs ?? {}); setOffline(false);
    } catch { setOffline(true); setWaiting((w) => w ?? []); }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const kicker = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
  const initials = (user?.name ?? user?.username ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const att = jobs.find((j) => j.key === 'attendance') ? sum.attendance : null;
  const sijil = user && seesSijil(user) ? sum.sijil : null;
  const n = waiting?.length ?? 0;
  // The Today card is a golden rectangle (width ÷ 1.618); on a short screen (iPhone Duo closed) a φ² strip.
  const cardW = Math.min(width, 560) - 40;
  const cardH = Math.round(short ? cardW / (PHI * PHI) : cardW / PHI);

  const hero = att ? (
    <Pressable accessibilityRole="button" accessibilityLabel={'Attendance, ' + (att.v ?? '') + ' ' + (att.u ?? '') + ', ' + (att.l ?? '')}
      onPress={() => { const j = jobs.find((x) => x.key === 'attendance'); if (j) onOpenJob(j); }}
      style={({ pressed }) => [s.hero, { minHeight: cardH, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Text style={[T.kicker, { color: C.onTealSoft }]}>Attendance</Text>
      <Text style={[T.hero, NUM, { color: '#FFFFFF', marginTop: S.s }]}>{att.v ?? '—'}<Text style={s.heroUnit}> {att.u ?? ''}</Text></Text>
      <Text style={[T.sub, { color: '#E4F3F1', marginTop: S.xs }]}>{att.l ?? ''}</Text>
      {typeof att.pct === 'number' ? <View style={{ marginTop: S.m }}><Progress pct={att.pct} color="#FFFFFF" track="rgba(255,255,255,0.25)" /></View> : null}
      <View style={{ flex: 1, minHeight: S.m }} />
      <View style={s.heroBtn}><Text style={s.heroBtnText}>Mark attendance</Text></View>
    </Pressable>
  ) : n > 0 ? (
    <Pressable accessibilityRole="button" accessibilityLabel={n + ' waiting for your signature'} onPress={onOpenApprovals}
      style={({ pressed }) => [s.hero, { minHeight: cardH, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Text style={[T.kicker, { color: C.onTealSoft }]}>Waiting for you</Text>
      <Text style={[T.hero, NUM, { color: '#FFFFFF', marginTop: S.s }]}>{n}<Text style={s.heroUnit}> to sign</Text></Text>
      <View style={{ flex: 1, minHeight: S.m }} />
      <View style={s.heroBtn}><Text style={s.heroBtnText}>Review and sign</Text></View>
    </Pressable>
  ) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle kicker={kicker} title="Today" right={
        <Pressable accessibilityRole="button" accessibilityLabel="Me" onPress={onOpenMe} style={s.avatar}><Text style={s.avatarText}>{initials}</Text></Pressable>} />
      {offline ? <Notice icon="warn" text="No signal. Showing what was loaded last; marks you make are kept on this phone." /> : null}
      {queuedCount > 0 ? <Notice tone="info" text={queuedCount + ' saved on this phone, sent when the signal is back.'} /> : null}

      {hero}

      {n > 0 ? (
        <Section title="Waiting for you">
          <Group>
            {(waiting ?? []).slice(0, 3).map((a) => (
              <Row key={a.kind + a.id} title={a.kicker + ' · ' + a.title} sub={a.sub} strong chevron onPress={() => onOpenApproval(a)}
                right={<Pill label={a.days ? a.days + 'd' : a.pill} tone={a.days ? 'bad' : 'info'} />} />
            ))}
            {n > 3 ? <Row title={'See all ' + n} onPress={onOpenApprovals} chevron /> : null}
          </Group>
        </Section>
      ) : waiting !== null && n === 0 && !att ? (
        <View style={s.calm}><Icon name="check" size={34} color={C.teal} stroke={2} /><Text style={T.section}>Nothing waiting for you</Text><Caption>New approvals show up here and as a notification.</Caption></View>
      ) : null}

      {jobs.length > 0 ? (
        <Section title="Your jobs">
          <View style={s.grid}>
            {jobs.map((j) => (
              <Pressable key={j.key} accessibilityRole="button" accessibilityLabel={j.label + ', ' + j.sub} onPress={() => onOpenJob(j)}
                style={({ pressed }) => [s.job, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <IconSquare name={j.icon} color={j.color} />
                <View><Text style={[T.bodyStrong, { fontSize: 15, lineHeight: 20 }]} numberOfLines={1}>{j.label}</Text><Text style={T.caption} numberOfLines={1}>{j.sub}</Text></View>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      {/* Sijil stays quiet (Ameen, 24 Nov 2026): no alerts for anyone, just this line. */}
      {sijil && sijil.tone !== 'ok' ? (
        <View style={{ gap: S.s }}>
          <Group><Row title="Records to renew" sub={(sijil.v && sijil.v !== '0' ? sijil.v + ' expired · ' : '') + (sijil.l ?? '').split(' · ')[0]}
            icon={<IconSquare name="doc" color={C.grey} size={29} />} /></Group>
          <Caption style={{ marginLeft: 16 }}>From Sijil. Shown here only — no reminders are sent.</Caption>
        </View>
      ) : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120, width: '100%', maxWidth: 600, alignSelf: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.teal, fontWeight: '700', fontSize: 15 },
  hero: { backgroundColor: C.teal, borderRadius: R.card, padding: S.l },
  heroUnit: { fontSize: 21, fontWeight: '600', letterSpacing: -0.3, color: C.onTealSoft },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: R.chip, paddingHorizontal: S.l, paddingVertical: 11 },
  heroBtnText: { color: C.teal, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.s },
  job: { flexGrow: 1, flexBasis: 100, minHeight: 89, backgroundColor: C.card, borderRadius: R.card, padding: S.m, gap: S.s, justifyContent: 'space-between' },
  calm: { alignItems: 'center', gap: S.xs, paddingVertical: S.xl },
});
