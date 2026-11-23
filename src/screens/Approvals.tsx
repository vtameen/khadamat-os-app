import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { OfflineError } from '../api';
import { useLayout } from '../layout';
import { loadWork, isDecision, moduleLabel, WorkItem } from '../work';
import { Btn, Chip, Empty, Loading, Notice, Title } from '../ui';
import { WebJob } from './WebJob';
import { C } from '../theme';

// The list only opens a document. Signing, approving or sending back happens on the
// document screen itself, after it has loaded — never from the list.
export function Approvals() {
  const { wide, listWidth } = useLayout();
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState<WorkItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems((await loadWork()).filter(isDecision)); setOffline(false); }
    catch (e) { setOffline(e instanceof OfflineError); setItems((p) => p ?? []); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const closeDoc = () => { setOpen(null); void load(); };
  const list = (
    <View style={{ flex: 1, padding: 20, gap: 14, width: wide ? listWidth : undefined }}>
      <Title title="Approvals" sub={items ? items.length + ' waiting for you' : undefined} />
      {offline ? <Notice text="No signal. Approvals need a connection." /> : null}
      {items === null ? <Loading /> : items.length === 0 ? <Empty title="Nothing waiting" body="New requests show up here and as a notification." /> : (
        <FlatList data={items} keyExtractor={(w, i) => w.id || String(i)} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item }) => (
            <View style={[s.card, open?.id === item.id ? s.cardOn : null]}>
              <View style={s.cardTop}><Chip label={moduleLabel(item.module)} tone={item.tone} />
                {item.days !== null ? <Text style={s.when}>{item.days < 0 ? Math.abs(item.days) + ' days late' : item.days === 0 ? 'Today' : 'In ' + item.days + ' days'}</Text> : null}</View>
              <Text style={s.title}>{item.title}</Text>
              {item.sub ? <Text style={s.sub}>{item.sub}</Text> : null}
              <Btn label="Review document" onPress={() => setOpen(item)} style={{ minHeight: 50, marginTop: 4 }} />
            </View>
          )} />
      )}
    </View>
  );
  const doc = open ? <WebJob path={open.action?.href ?? open.link} title={moduleLabel(open.module)} onClose={closeDoc} /> : null;

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.ground }}>
        {list}
        <View style={s.pane}>{doc ?? <Empty title="Pick a document" body="It opens here, beside the list." />}</View>
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: C.ground }}>{doc ?? list}</View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 8, borderWidth: 2, borderColor: C.card },
  cardOn: { borderColor: C.teal },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  when: { fontSize: 12, color: C.muted },
  title: { fontSize: 17, fontWeight: '700', color: C.ink },
  sub: { fontSize: 14, color: C.muted },
  pane: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.line },
});
