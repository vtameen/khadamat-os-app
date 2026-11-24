import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineError } from '../api';
import { useSession } from '../session';
import { useLayout } from '../layout';
import { Approval, loadApprovals } from '../approvals';
import { Icon } from '../icons';
import { Caption, Empty, LargeTitle, Loading, Notice, Pill, Segmented } from '../ui';
import { ApprovalDoc } from './ApprovalDoc';
import { C, R, S, T } from '../theme';

// Everything waiting for this person's signature. The list only opens a document;
// Sign / Send back / Reject live on the document screen, after it has opened.
export function Approvals({ openFirst, onOpened, onDocOpen }: { openFirst?: Approval | null; onOpened?: () => void; onDocOpen?: (open: boolean) => void }) {
  const { user } = useSession();
  const { split, listWidth } = useLayout();
  const [items, setItems] = useState<Approval[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState<Approval | null>(openFirst ?? null);
  const [filter, setFilter] = useState<'all' | 'lpo' | 'payreq' | 'doc'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await loadApprovals(user?.id ?? '')); setOffline(false); }
    catch (e) { setOffline(e instanceof OfflineError); setItems((p) => p ?? []); }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (openFirst) { setOpen(openFirst); onOpened?.(); } }, [openFirst]); // eslint-disable-line react-hooks/exhaustive-deps

  // On a phone the document takes the whole screen, so the tab bar steps aside (its own bar holds Sign).
  useEffect(() => { onDocOpen?.(!split && !!open); }, [open, split]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onDocOpen?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const done = () => { setOpen(null); void load(); };
  const counts = { lpo: 0, payreq: 0, doc: 0 } as Record<string, number>;
  (items ?? []).forEach((a) => { counts[a.kind]++; });
  const shown = (items ?? []).filter((a) => filter === 'all' || a.kind === filter);
  const segs = [{ key: 'all' as const, label: 'All · ' + (items?.length ?? 0) },
    ...(counts.lpo ? [{ key: 'lpo' as const, label: 'LPO · ' + counts.lpo }] : []),
    ...(counts.payreq ? [{ key: 'payreq' as const, label: 'Payment · ' + counts.payreq }] : []),
    ...(counts.doc ? [{ key: 'doc' as const, label: 'Docs · ' + counts.doc }] : [])];

  const list = (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <LargeTitle title={user?.canExec ? 'To sign' : 'Approvals'} sub={items ? (items.length ? items.length + ' waiting for you · oldest first' : undefined) : undefined} />
      {offline ? <Notice icon="warn" text="No signal. Approvals need a connection." /> : null}
      {segs.length > 2 ? <Segmented items={segs} value={filter} onChange={setFilter} /> : null}
      {items === null ? <View style={{ height: 200 }}><Loading /></View>
        : shown.length === 0 ? <View style={{ height: 320 }}><Empty icon="check" title="Nothing waiting" body="New approvals show up here and as a notification." /></View>
        : shown.map((a) => (
          <Pressable key={a.kind + a.id} accessibilityRole="button" accessibilityLabel={a.kicker + ' ' + a.title + ', ' + a.sub}
            onPress={() => setOpen(a)} style={({ pressed }) => [s.card, open?.id === a.id && open.kind === a.kind ? s.cardOn : null, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={s.top}><Text style={T.kicker} numberOfLines={1}>{a.kicker}</Text><Pill label={a.days ? 'Waiting ' + a.days + 'd' : a.pill} tone={a.days ? 'bad' : 'info'} /></View>
            <Text style={T.section} numberOfLines={2}>{a.title}</Text>
            {a.sub ? <Text style={T.sub} numberOfLines={2}>{a.sub}</Text> : null}
            <View style={s.foot}><Text style={[T.bodyStrong, { color: C.teal }]}>Open {a.kind === 'payreq' ? 'request' : 'document'}</Text><Icon name="chevron" size={14} color={C.faint} stroke={2.6} /></View>
          </Pressable>
        ))}
      {shown.length > 0 ? <Caption style={{ textAlign: 'center', paddingHorizontal: S.l }}>Sign, Send back and Reject appear once the document is open.</Caption> : null}
    </ScrollView>
  );
  const doc = open ? <ApprovalDoc item={open} onClose={() => setOpen(null)} onDone={done} /> : null;

  if (split) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.ground }}>
        <View style={{ width: listWidth, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line }}>{list}</View>
        <View style={{ flex: 1 }}>{doc ?? <Empty icon="doc" title="Pick a document" body="It opens here, beside the list." />}</View>
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: C.ground }}>{doc ?? list}</View>;
}
const s = StyleSheet.create({
  wrap: { padding: 20, paddingTop: S.l, gap: S.l, paddingBottom: 120 },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: S.s, borderWidth: 2, borderColor: C.card },
  cardOn: { borderColor: C.teal },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.s },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.xs, paddingTop: S.m, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
