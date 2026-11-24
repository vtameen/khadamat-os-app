import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from './src/session';
import { jobsFor, Job } from './src/jobs';
import { useLayout } from './src/layout';
import { flush, onOutboxChange } from './src/outbox';
import { registerPush } from './src/push';
import { Approval, loadApprovals } from './src/approvals';
import { Icon, IconName } from './src/icons';
import { Login } from './src/screens/Login';
import { Unlock } from './src/screens/Unlock';
import { ChangePassword } from './src/screens/ChangePassword';
import { Today } from './src/screens/Today';
import { Approvals } from './src/screens/Approvals';
import { Attendance } from './src/screens/Attendance';
import { Alerts } from './src/screens/Alerts';
import { Me } from './src/screens/Me';
import { CampOps } from './src/screens/CampOps';
import { ExecToday } from './src/screens/ExecToday';
import { ExecCamps } from './src/screens/ExecCamps';
import { ExecModules } from './src/screens/ExecModules';
import { alertTarget } from './src/screens/Alerts';
import type { ModuleDef } from './src/exec';
import { Loading } from './src/ui';
import { C, S, T } from './src/theme';

// Every screen here is a real app screen (Ameen, 24 Nov 2026): no website pages inside the app.
type Tab = 'today' | 'approvals' | 'alerts' | 'me' | 'camps' | 'modules';
const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'today', label: 'Today', icon: 'today' }, { key: 'approvals', label: 'Approvals', icon: 'approvals' },
  { key: 'alerts', label: 'Alerts', icon: 'alerts' }, { key: 'me', label: 'Me', icon: 'me' },
];
// Executive mode (Haneef and the owner, user.canExec): every module to look at, signing in the app.
// Alerts sit behind the bell on Today.
const EXEC_TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'today', label: 'Today', icon: 'today' }, { key: 'approvals', label: 'To sign', icon: 'approvals' },
  { key: 'camps', label: 'Camps', icon: 'building' }, { key: 'modules', label: 'Modules', icon: 'grid' }, { key: 'me', label: 'Me', icon: 'me' },
];

function Shell() {
  const { user, ready, locked } = useSession();
  const { wide, sidebar } = useLayout();
  const inset = useSafeAreaInsets();
  const [campStaff, setCampStaff] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [job, setJob] = useState<Job | null>(null);
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [docOpen, setDocOpen] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [campOpen, setCampOpen] = useState<string | null>(null);
  const [modOpen, setModOpen] = useState<ModuleDef['detail'] | null>(null);
  const exec = !!user?.canExec;
  const tabs = exec ? EXEC_TABS : TABS;

  useEffect(() => onOutboxChange(setQueuedCount), []);
  const count = useCallback(async () => { if (!user) return; try { setWaiting((await loadApprovals(user.id)).length); } catch { /* keep the last count */ } }, [user]);
  useEffect(() => {
    if (!user) return;
    void registerPush(); void flush(); void count();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') { void flush(); void count(); } });
    const t = setInterval(() => { void flush(); void count(); }, 60000);
    return () => { sub.remove(); clearInterval(t); };
  }, [user, count]);
  useEffect(() => { setTab('today'); setJob(null); }, [user?.id]);
  // Tapping a notification opens what it is about: the item to sign, Approvals, or Today.
  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;
    const open = (link: string) => {
      const a = alertTarget(link);
      if (a) { setJob(null); setOpenApproval(a); setTab('approvals'); return; }
      if (link.startsWith('/app/approvals')) { setJob(null); setTab('approvals'); return; }
      if (link.startsWith('/campops') && exec) { setJob(null); setTab('camps'); return; }
      if (link.startsWith('/app/')) { setJob(null); setTab('today'); }
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const d: any = r.notification.request.content.data ?? {};
      open(String(d.link ?? ''));
    });
    return () => sub.remove();
  }, [user, exec]);
  const jobs = useMemo(() => (user ? jobsFor(user) : []), [user]);

  if (!ready) return <Loading />;
  if (locked) return <Unlock />;
  if (!user) return campStaff ? <CampOps onExit={() => setCampStaff(false)} /> : <Login onCampStaff={() => setCampStaff(true)} />;
  if (user.mustChange) return <ChangePassword />;

  const go = (t: Tab) => { setJob(null); setTab(t); if (t === 'approvals') void count(); if (t === 'modules') setModOpen(null); };
  const toApproval = (a: Approval) => { setJob(null); setOpenApproval(a); setTab('approvals'); };
  let body: React.ReactNode;
  if (job?.key === 'attendance') body = <Attendance onBack={() => setJob(null)} />;
  else if (tab === 'approvals') body = <Approvals openFirst={openApproval} onOpened={() => setOpenApproval(null)} onDocOpen={setDocOpen} />;
  else if (tab === 'alerts') body = <Alerts onOpenApproval={toApproval} />;
  else if (tab === 'me') body = <Me />;
  else if (exec && tab === 'camps') body = <ExecCamps openCamp={campOpen} onOpened={() => setCampOpen(null)} />;
  else if (exec && tab === 'modules') body = <ExecModules open={modOpen} onOpen={setModOpen} onOpenCamps={() => go('camps')} />;
  else if (exec) body = <ExecToday onOpenApprovals={() => go('approvals')} onOpenCamps={() => go('camps')} onOpenCamp={(id) => { setCampOpen(id); go('camps'); }}
    onOpenSijil={() => { setJob(null); setTab('modules'); setModOpen('sijil'); }} onOpenAlerts={() => go('alerts')} onOpenMe={() => go('me')} />;
  else body = <Today jobs={jobs} queuedCount={queuedCount} onOpenJob={setJob} onOpenApproval={toApproval} onOpenApprovals={() => go('approvals')} onOpenMe={() => go('me')} />;

  if (wide) {
    // iPhone Duo open / Galaxy Z Fold open / tablet: iPad-style sidebar, 38.2% of the width.
    const d = new Date();
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.ground }}>
        <View style={[s.sidebar, { width: sidebar, paddingTop: inset.top + S.xl }]} accessibilityRole="tablist">
          <Text style={[T.kicker, { marginHorizontal: S.m }]} numberOfLines={1}>{(user.name ?? user.username ?? '') + ' · ' + d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}</Text>
          <Text style={[T.title, { marginHorizontal: S.m, marginBottom: S.s }]}>Khadamat</Text>
          {tabs.filter((t) => t.key !== 'me').map((t) => <SideItem key={t.key} label={t.label} icon={t.icon} on={!job && tab === t.key} count={t.key === 'approvals' ? waiting : 0} onPress={() => go(t.key)} />)}
          {exec ? <SideItem label="Alerts" icon="alerts" on={!job && tab === 'alerts'} onPress={() => go('alerts')} /> : null}
          {jobs.map((j) => <SideItem key={j.key} label={j.label} icon={j.icon} on={job?.key === j.key} onPress={() => setJob(j)} />)}
          <View style={{ flex: 1 }} />
          <SideItem label="Me" icon="me" on={!job && tab === 'me'} onPress={() => go('me')} />
        </View>
        <View style={{ flex: 1, paddingTop: inset.top }}>{body}</View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.ground, paddingTop: inset.top }}>
      <View style={{ flex: 1 }}>{body}</View>
      {job || (docOpen && tab === 'approvals') ? null : (
        <View style={[s.bar, { paddingBottom: Math.max(inset.bottom, S.s) }]} accessibilityRole="tablist">
          {Platform.OS === 'web' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(249,249,249,0.94)' }]} /> : <BlurView intensity={80} tint="systemChromeMaterialLight" style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? C.bar : 'transparent' }]} />}
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label + (t.key === 'approvals' && waiting ? ', ' + waiting + ' waiting' : '')}
                accessibilityState={{ selected: on }} onPress={() => go(t.key)} style={s.barItem}>
                <Icon name={t.icon} size={26} color={on ? C.teal : C.muted} />
                {t.key === 'approvals' && waiting > 0 ? <View style={s.badge}><Text style={s.badgeText}>{waiting > 99 ? '99+' : waiting}</Text></View> : null}
                <Text style={[T.tab, on ? { color: C.teal } : null]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
function SideItem({ label, icon, on, count, onPress }: { label: string; icon: IconName; on: boolean; count?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label + (count ? ', ' + count : '')} onPress={onPress}
      style={({ pressed }) => [s.side, on ? { backgroundColor: C.teal } : pressed ? { backgroundColor: '#E5E5EA' } : null]}>
      <Icon name={icon} size={22} color={on ? '#FFFFFF' : C.teal} stroke={1.9} />
      <Text style={[T.body, { flex: 1 }, on ? { color: '#FFFFFF' } : null]} numberOfLines={1}>{label}</Text>
      {count ? <Text style={[T.sub, on ? { color: C.onTealSoft } : null]}>{count}</Text> : null}
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }} edges={['left', 'right']}>
        <SessionProvider><Shell /></SessionProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: S.s, overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.barLine },
  barItem: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 3 },
  badge: { position: 'absolute', top: -2, left: '54%', minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: C.red, alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sidebar: { backgroundColor: 'rgba(249,249,249,0.85)', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.barLine, paddingHorizontal: S.m, paddingBottom: S.l, gap: S.xs },
  side: { flexDirection: 'row', alignItems: 'center', gap: S.m, minHeight: 44, paddingHorizontal: S.m, borderRadius: 10 },
});
