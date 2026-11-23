import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, OfflineError } from '../api';
import { useSession } from '../session';
import type { Job } from '../jobs';
import { loadWork, isDecision, moduleLabel, WorkItem } from '../work';
import { Card, Chip, Label, Notice, Title } from '../ui';
import { C } from '../theme';

type Glimpse = { v?: string | number; u?: string; l?: string; tone?: string; pct?: number } | null;

export function Today({ jobs, onOpenJob, onOpenLink, onOpenApprovals, queuedCount }: {
  jobs: Job[]; onOpenJob: (j: Job) => void; onOpenLink: (href: string, title: string) => void; onOpenApprovals: () => void; queuedCount: number;
}) {
  const { user } = useSession();
  const [work, setWork] = useState<WorkItem[]>([]);
  const [att, setAtt] = useState<Glimpse>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasAttendance = jobs.some((j) => j.key === 'attendance');

  const load = useCallback(async () => {
    try {
      const [w, hs] = await Promise.all([loadWork().catch((e) => { if (e instanceof OfflineError) throw e; return [] as WorkItem[]; }),
        api<Record<string, Glimpse>>('/home-summary').catch((e) => { if (e instanceof OfflineError) throw e; return {} as Record<string, Glimpse>; })]);
      setWork(w); setAtt(hs?.attendance ?? null); setOffline(false);
    } catch { setOffline(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decisions = work.filter(isDecision);
  const others = work.filter((w) => !isDecision(w)).slice(0, 5);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const initials = (user?.name ?? user?.username ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const attJob = jobs.find((j) => j.key === 'attendance');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Title title="Today" sub={date} right={<View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>} />
      {offline ? <Notice text="No signal. Showing what was loaded last; marks you make are saved on this phone." /> : null}
      {queuedCount > 0 ? <Notice text={queuedCount + ' saved on this phone, will send when back online.'} /> : null}

      {hasAttendance && attJob ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Mark attendance" onPress={() => onOpenJob(attJob)} style={s.hero}>
          <Text style={s.heroKicker}>Attendance</Text>
          <Text style={s.heroBig}>{att?.v !== undefined ? String(att.v) : 'Mark today'}</Text>
          <Text style={s.heroSub}>{att?.l ?? 'Open daily marking'}</Text>
          <View style={s.heroBtn}><Text style={s.heroBtnText}>Mark attendance</Text></View>
        </Pressable>
      ) : decisions.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open approvals" onPress={onOpenApprovals} style={s.hero}>
          <Text style={s.heroKicker}>Waiting for your decision</Text>
          <Text style={s.heroBig}>{decisions.length + (decisions.length === 1 ? ' approval' : ' approvals')}</Text>
          <View style={s.heroBtn}><Text style={s.heroBtnText}>Review</Text></View>
        </Pressable>
      ) : null}

      {hasAttendance && decisions.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={onOpenApprovals}><Card style={s.rowCard}>
          <Text style={s.rowText}>{decisions.length + (decisions.length === 1 ? ' approval waiting' : ' approvals waiting')}</Text><Chip label="Review" tone="warn" />
        </Card></Pressable>
      ) : null}

      {others.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Label>Needs you</Label>
          <Card style={{ padding: 0 }}>
            {others.map((w, i) => (
              <Pressable key={w.id || i} accessibilityRole="button" onPress={() => onOpenLink(w.action?.href ?? w.link, moduleLabel(w.module))}
                style={[s.needRow, i > 0 ? { borderTopWidth: 1, borderTopColor: C.line } : null]}>
                <View style={{ flex: 1 }}><Text style={s.rowText}>{w.title}</Text>{w.sub ? <Text style={s.rowSub} numberOfLines={2}>{w.sub}</Text> : null}</View>
                <Chip label={moduleLabel(w.module)} tone={w.tone} />
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Label>Your jobs</Label>
        <View style={s.grid}>
          {jobs.map((j) => (
            <Pressable key={j.key} accessibilityRole="button" accessibilityLabel={j.label} onPress={() => onOpenJob(j)} style={s.job}>
              <Text style={s.jobTitle}>{j.label}</Text><Text style={s.rowSub}>{j.sub}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, gap: 18, paddingBottom: 32 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.teal, fontWeight: '700', fontSize: 15 },
  hero: { backgroundColor: C.teal, borderRadius: 22, padding: 22, gap: 8 },
  heroKicker: { color: C.onTealSoft, fontSize: 13, fontWeight: '500' },
  heroBig: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  heroSub: { color: C.onTealSoft, fontSize: 15 },
  heroBtn: { minHeight: 54, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  heroBtnText: { color: C.teal, fontSize: 16, fontWeight: '700' },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  needRow: { minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, color: C.ink, fontWeight: '500' },
  rowSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  job: { flexGrow: 1, flexBasis: 150, minHeight: 84, borderRadius: 18, backgroundColor: C.card, padding: 14, justifyContent: 'space-between' },
  jobTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
});
