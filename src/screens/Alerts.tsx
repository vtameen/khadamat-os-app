import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Approval } from '../approvals';
import { IconName } from '../icons';
import { Btn, Empty, IconSquare, LargeTitle, Loading, Section } from '../ui';
import { C, R, S, T } from '../theme';

type N = { id: string; title: string; body: string; link: string; read: boolean; at: string; type: string };

// Sijil reminders never show here (Ameen, 24 Nov 2026: no Sijil notifications for anyone).
const isSijil = (n: N) => /\/sijil\b|#compliance/i.test(n.link) || /\bsijil\b/i.test(n.type);
/** An alert opens its item inside the app when the app has a screen for it; otherwise it is just read. */
export function alertTarget(link: string): Approval | null {
  let m = link.match(/^\/lpo\/#doc\/([A-Za-z0-9_-]+)/);
  if (m) return { kind: 'lpo', id: m[1], kicker: 'LPO', title: 'LPO', sub: '', tone: 'info', days: 0, pill: 'Sign' };
  m = link.match(/^\/payreq\/\?id=([^&]+)/);
  if (m) return { kind: 'payreq', id: decodeURIComponent(m[1]), kicker: 'Payment request', title: 'Payment request', sub: '', tone: 'info', days: 0, pill: 'Sign' };
  return null;
}
function iconFor(n: N): { name: IconName; color: string } {
  const l = n.link; const t = (n.type + ' ' + n.title).toLowerCase();
  if (l.startsWith('/lpo') || l.startsWith('/payreq') || t.includes('sign')) return { name: 'pen', color: C.blue };
  if (t.includes('transfer')) return { name: 'transfer', color: C.orange };
  if (l.startsWith('/attendance') || t.includes('attendance')) return { name: 'clock', color: C.teal };
  if (l.startsWith('/tasks')) return { name: 'list', color: C.indigo };
  if (l.startsWith('/campops')) return { name: 'building', color: C.teal };
  return { name: 'bell', color: C.grey };
}
function when(at: string): string {
  const d = new Date(at); if (isNaN(d.getTime())) return '';
  const p = (x: number) => String(x).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}
function dayOf(at: string): string {
  const d = new Date(at); if (isNaN(d.getTime())) return 'Earlier';
  const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export function Alerts({ onOpenApproval }: { onOpenApproval: (a: Approval) => void }) {
  const [items, setItems] = useState<N[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await api<{ data?: any[] }>('/notifications/mine');
      setItems((r.data ?? []).map((x) => ({ id: String(x.id ?? ''), title: String(x.title ?? x.message ?? 'Notification'), body: String(x.body ?? x.text ?? ''),
        link: String(x.link ?? ''), read: !!(x.read || x.readAt), at: String(x.ts ?? x.createdAt ?? x.at ?? ''), type: String(x.type ?? '') })).filter((n) => !isSijil(n)));
    } catch { setItems((p) => p ?? []); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const markAll = async () => { try { await api('/notifications/mark-read', { all: true }); } catch { /* retry later */ } void load(); };
  const unread = (items ?? []).filter((n) => !n.read).length;
  const groups: Array<[string, N[]]> = [];
  (items ?? []).forEach((n) => { const g = dayOf(n.at); const last = groups[groups.length - 1]; if (last && last[0] === g) last[1].push(n); else groups.push([g, [n]]); });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle title="Alerts" right={unread > 0 ? <Btn label="Mark all read" kind="text" onPress={markAll} /> : undefined} />
      {items === null ? <View style={{ height: 200 }}><Loading /></View> : items.length === 0 ? <View style={{ height: 320 }}><Empty icon="bell" title="No alerts" /></View>
        : groups.map(([g, list]) => (
          <Section key={g} title={g}>
            <View style={s.group}>
              {list.map((n, i) => {
                const target = alertTarget(n.link); const ic = iconFor(n);
                const body = (
                  <>
                    <View style={[s.dot, n.read ? { backgroundColor: 'transparent' } : null]} />
                    <IconSquare name={ic.name} color={ic.color} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.s }}>
                        <Text style={[n.read ? T.body : T.bodyStrong, { flex: 1 }]} numberOfLines={2}>{n.title}</Text>
                        <Text style={T.caption}>{when(n.at)}</Text>
                      </View>
                      {n.body ? <Text style={T.sub} numberOfLines={3}>{n.body}</Text> : null}
                    </View>
                  </>
                );
                return target
                  ? <Pressable key={n.id || i} accessibilityRole="button" onPress={() => onOpenApproval(target)} style={({ pressed }) => [s.row, i > 0 ? s.sep : null, pressed ? { backgroundColor: '#E5E5EA' } : null]}>{body}</Pressable>
                  : <View key={n.id || i} style={[s.row, i > 0 ? s.sep : null]}>{body}</View>;
              })}
            </View>
          </Section>
        ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120 },
  group: { backgroundColor: C.card, borderRadius: R.card, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: S.m, paddingHorizontal: 16, paddingVertical: S.m, alignItems: 'flex-start' },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue, marginTop: 13, marginLeft: -6 },
});
