import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Btn, Empty, Loading, Title } from '../ui';
import { C } from '../theme';

type N = { id: string; title: string; body: string; link: string; read: boolean; at: string };
export function Alerts({ onOpenLink }: { onOpenLink: (href: string, title: string) => void }) {
  const [items, setItems] = useState<N[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await api<{ data?: any[] }>('/notifications/mine');
      setItems((r.data ?? []).map((x) => ({ id: String(x.id ?? ''), title: String(x.title ?? x.message ?? 'Notification'), body: String(x.body ?? x.text ?? ''),
        link: String(x.link ?? ''), read: !!(x.read || x.readAt), at: String(x.createdAt ?? x.at ?? '') })));
    } catch { setItems((p) => p ?? []); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const markAll = async () => { try { await api('/notifications/mark-read', { all: true }); } catch { /* retry later */ } void load(); };
  const unread = (items ?? []).filter((n) => !n.read).length;
  return (
    <View style={{ flex: 1, backgroundColor: C.ground, padding: 20, gap: 14 }}>
      <Title title="Alerts" sub={items ? unread + ' unread' : undefined} />
      {items === null ? <Loading /> : items.length === 0 ? <Empty title="No alerts" /> : (
        <FlatList data={items} keyExtractor={(n, i) => n.id || String(i)} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListHeaderComponent={unread > 0 ? <Btn label="Mark all read" kind="plain" onPress={markAll} style={{ minHeight: 44, marginBottom: 4 }} /> : undefined}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" disabled={!item.link.startsWith('/')} onPress={() => onOpenLink(item.link, 'Alert')} style={[s.row, !item.read ? s.unread : null]}>
              <Text style={s.title}>{item.title}</Text>
              {item.body ? <Text style={s.body} numberOfLines={3}>{item.body}</Text> : null}
            </Pressable>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: { backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 4, borderLeftWidth: 0 },
  unread: { backgroundColor: C.tealTint },
  title: { fontSize: 15, fontWeight: '600', color: C.ink },
  body: { fontSize: 13, color: C.muted },
});
