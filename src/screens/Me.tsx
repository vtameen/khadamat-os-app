import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSession } from '../session';
import { flush, queued, Queued } from '../outbox';
import type { Job } from '../jobs';
import { Btn, Card, Label, Notice, Title } from '../ui';
import { C } from '../theme';

export function Me({ jobs, queuedCount }: { jobs: Job[]; queuedCount: number }) {
  const { user, logout } = useSession();
  const [items, setItems] = useState<Queued[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { void queued().then(setItems); }, [queuedCount]);
  const sync = async () => {
    const r = await flush();
    setMsg(r.refused.length ? 'Not accepted: ' + r.refused.join('; ') : r.left ? `Sent ${r.sent}. ${r.left} still waiting for signal.` : `All sent (${r.sent}).`);
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Title title={user?.name ?? user?.username ?? 'Me'} sub={user?.email ?? user?.username} />
      <View style={{ gap: 8 }}>
        <Label>Saved on this phone</Label>
        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 15, color: C.ink }}>{items.length === 0 ? 'Nothing waiting to send.' : items.length + ' waiting to send'}</Text>
          {items.slice(0, 5).map((q) => <Text key={q.id} style={{ fontSize: 13, color: C.muted }}>{q.label}</Text>)}
          {items.length > 0 ? <Btn label="Send now" onPress={sync} /> : null}
          {msg ? <Notice text={msg} tone="info" /> : null}
        </Card>
      </View>
      <View style={{ gap: 8 }}>
        <Label>Your jobs in this app</Label>
        <Card style={{ gap: 6 }}>{jobs.map((j) => <Text key={j.key} style={{ fontSize: 15, color: C.ink }}>{j.label}</Text>)}</Card>
      </View>
      <Btn label="Sign out" kind="danger" onPress={() => void logout()} />
    </ScrollView>
  );
}
