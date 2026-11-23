import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from './src/session';
import { jobsFor, Job } from './src/jobs';
import { useLayout } from './src/layout';
import { flush, onOutboxChange } from './src/outbox';
import { registerPush } from './src/push';
import { Login } from './src/screens/Login';
import { Today } from './src/screens/Today';
import { Approvals } from './src/screens/Approvals';
import { Attendance } from './src/screens/Attendance';
import { Alerts } from './src/screens/Alerts';
import { Me } from './src/screens/Me';
import { WebJob } from './src/screens/WebJob';
import { CampOps } from './src/screens/CampOps';
import { Btn, Loading } from './src/ui';
import { C } from './src/theme';

type Tab = 'today' | 'job' | 'approvals' | 'alerts' | 'me';
type Overlay = { kind: 'job'; job: Job } | { kind: 'link'; href: string; title: string } | null;

function Shell() {
  const { user, ready, refresh } = useSession();
  const { wide } = useLayout();
  const [campStaff, setCampStaff] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => onOutboxChange(setQueuedCount), []);
  useEffect(() => {
    if (!user) return;
    void registerPush(); void flush();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') void flush(); });
    const t = setInterval(() => void flush(), 30000);
    return () => { sub.remove(); clearInterval(t); };
  }, [user]);

  const jobs = useMemo(() => (user ? jobsFor(user) : []), [user]);
  // One job: the job is the whole app. No home screen, no menu.
  const single = jobs.length === 1 ? jobs[0] : null;
  useEffect(() => { setTab(single ? 'job' : 'today'); setOverlay(null); }, [single?.key, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Loading />;
  if (!user) {
    if (campStaff) return <CampOps onExit={() => setCampStaff(false)} />;
    return <Login onCampStaff={() => setCampStaff(true)} />;
  }
  if (user.mustChange) {
    return (
      <View style={{ flex: 1 }}>
        <WebJob path="/" title="Set your new password" />
        <View style={{ padding: 12, backgroundColor: C.card }}><Btn label="I have set my password" onPress={() => void refresh()} /></View>
      </View>
    );
  }

  const renderJob = (j: Job, onBack?: () => void) =>
    j.kind === 'native' && j.key === 'attendance' ? <Attendance onBack={onBack} /> : <WebJob path={j.path ?? '/'} title={j.label} onClose={onBack} />;

  const tabs: Array<{ key: Tab; label: string }> = single
    ? [{ key: 'job', label: single.label }, { key: 'alerts', label: 'Alerts' }, { key: 'me', label: 'Me' }]
    : [{ key: 'today', label: 'Today' }, { key: 'approvals', label: 'Approvals' }, { key: 'alerts', label: 'Alerts' }, { key: 'me', label: 'Me' }];

  const openLink = (href: string, title: string) => { if (href && href.startsWith('/')) setOverlay({ kind: 'link', href, title }); };
  let body: React.ReactNode;
  if (overlay) {
    body = overlay.kind === 'job' ? renderJob(overlay.job, () => setOverlay(null)) : <WebJob path={overlay.href} title={overlay.title} onClose={() => setOverlay(null)} />;
  } else if (tab === 'job' && single) body = renderJob(single);
  else if (tab === 'approvals') body = <Approvals />;
  else if (tab === 'alerts') body = <Alerts onOpenLink={openLink} />;
  else if (tab === 'me') body = <Me jobs={jobs} queuedCount={queuedCount} />;
  else body = <Today jobs={jobs} queuedCount={queuedCount} onOpenJob={(j) => setOverlay({ kind: 'job', job: j })} onOpenLink={openLink} onOpenApprovals={() => setTab('approvals')} />;

  const nav = (
    <View style={wide ? s.rail : s.bar} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = !overlay && tab === t.key;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setOverlay(null); setTab(t.key); }}
            style={[wide ? s.railItem : s.barItem, on && wide ? { backgroundColor: C.tealTint } : null]}>
            <Text style={[s.navText, on ? { color: C.teal, fontWeight: '700' } : null]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  // Wide (unfolded / tablet): side rail. Narrow: bottom bar.
  return wide
    ? <View style={{ flex: 1, flexDirection: 'row' }}>{nav}<View style={{ flex: 1 }}>{body}</View></View>
    : <View style={{ flex: 1 }}><View style={{ flex: 1 }}>{body}</View>{nav}</View>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }}>
        <StatusBar style="dark" />
        <SessionProvider><Shell /></SessionProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  bar: { minHeight: 64, flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line },
  barItem: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  rail: { width: 72, paddingVertical: 16, gap: 6, alignItems: 'center', backgroundColor: C.card, borderRightWidth: 1, borderRightColor: C.line },
  railItem: { width: 62, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navText: { fontSize: 12, fontWeight: '500', color: C.muted, textAlign: 'center' },
});
