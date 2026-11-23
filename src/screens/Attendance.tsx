import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError, OfflineError, todayYmd } from '../api';
import { postOrQueue } from '../outbox';
import { useLayout } from '../layout';
import { Btn, Chip, Empty, Loading, Notice, Progress, Title } from '../ui';
import { C } from '../theme';

type Emp = { id: string; name: string; site: string; role: string };
type Mark = { status: string; ot: number; pending?: boolean };
const pick = (o: any, keys: string[]): string => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return String(o[k]).trim(); return ''; };
const STATUSES: Array<{ code: string; label: string }> = [
  { code: 'L', label: 'Leave' }, { code: 'SL', label: 'Sick' }, { code: 'H', label: 'Half' }, { code: 'O', label: 'Off' },
];
const NAME: Record<string, string> = { P: 'Present', A: 'Absent', L: 'Leave', SL: 'Sick', H: 'Half day', O: 'Off', HO: 'Holiday' };
const CACHE = 'khd_att_cache_v1';

export function Attendance({ onBack }: { onBack?: () => void }) {
  const { wide, short, listWidth } = useLayout();
  const date = todayYmd();
  const [emps, setEmps] = useState<Emp[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [site, setSite] = useState('');
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [sel, setSel] = useState<string | null>(null);
  const [ot, setOt] = useState(0);
  const [note, setNote] = useState('');
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, en] = await Promise.all([api<{ data?: any[] }>('/employees'), api<{ data?: any[] }>(`/entries?from=${date}&to=${date}`)]);
      const list: Emp[] = (e.data ?? []).filter((x) => x && x.active !== false).map((x) => ({
        id: pick(x, ['id', 'ID', 'EMP_ID', 'Emp ID', 'emp_id', 'employee_id', 'empId']), name: pick(x, ['name', 'Name', 'Employee Name', 'EMPLOYEE_NAME', 'emp_name']),
        site: pick(x, ['site', 'Site', 'PROJECT', 'Project', 'SITE']), role: pick(x, ['designation', 'Designation', 'trade', 'category']),
      })).filter((x) => x.id);
      const m: Record<string, Mark> = {};
      for (const r of en.data ?? []) if (r && r.date === date && r.status) m[String(r.empId ?? '').trim()] = { status: String(r.status), ot: Number(r.ot) || 0 };
      setEmps(list); setMarks((prev) => { const keep: Record<string, Mark> = {}; for (const k in prev) if (prev[k].pending) keep[k] = prev[k]; return { ...m, ...keep }; });
      setOffline(false);
      void AsyncStorage.setItem(CACHE, JSON.stringify({ date, list, m }));
    } catch (err) {
      if (err instanceof ApiError) { setNote(err.message); setEmps((p) => p ?? []); return; }
      setOffline(err instanceof OfflineError);
      try {
        const c = JSON.parse((await AsyncStorage.getItem(CACHE)) ?? 'null');
        if (c && Array.isArray(c.list)) { setEmps((p) => p ?? c.list); if (c.date === date) setMarks((p) => ({ ...c.m, ...p })); } else setEmps((p) => p ?? []);
      } catch { setEmps((p) => p ?? []); }
    }
  }, [date]);
  useEffect(() => { void load(); }, [load]);

  const sites = useMemo(() => Array.from(new Set((emps ?? []).map((e) => e.site).filter(Boolean))).sort(), [emps]);
  useEffect(() => { if (!site && sites.length) setSite(sites[0]); }, [sites, site]);
  const here = useMemo(() => (emps ?? []).filter((e) => !site || e.site === site), [emps, site]);
  const todo = here.filter((e) => !marks[e.id]);
  const done = here.filter((e) => marks[e.id]);
  const shown = tab === 'todo' ? todo : done;
  const cur = here.find((e) => e.id === sel) ?? null;
  useEffect(() => { setOt(cur && marks[cur.id] ? marks[cur.id].ot : 0); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = async (emp: Emp, status: string) => {
    setNote('');
    const before = marks[emp.id];
    setMarks((p) => ({ ...p, [emp.id]: { status, ot, pending: true } }));
    const next = todo.find((e) => e.id !== emp.id);
    try {
      const r = await postOrQueue('/entries/mark', { empId: emp.id, date, status, ...(ot > 0 ? { ot } : {}) }, emp.name + ' · ' + (NAME[status] ?? status));
      setMarks((p) => ({ ...p, [emp.id]: { status, ot, pending: r === 'queued' } }));
      if (r === 'queued') setOffline(true);
      if (tab === 'todo') setSel(next ? next.id : null);
    } catch (err) {
      setMarks((p) => { const n = { ...p }; if (before) n[emp.id] = before; else delete n[emp.id]; return n; });
      setNote(err instanceof ApiError ? err.message : 'Could not save. Try again.');
    }
  };

  if (emps === null) return <Loading />;
  const queuedHere = here.filter((e) => marks[e.id]?.pending).length;

  const list = (
    <View style={{ flex: 1, padding: 20, paddingBottom: 0, gap: short ? 8 : 12, width: wide ? listWidth : undefined }}>
      <Title title={site || 'Attendance'} sub={`${done.length} of ${here.length} marked`}
        right={onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={s.pill}><Text style={s.pillText}>Back</Text></Pressable> : undefined} />
      <Progress pct={here.length ? (done.length / here.length) * 100 : 0} />
      {sites.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {sites.map((x) => (
            <Pressable key={x} accessibilityRole="button" onPress={() => { setSite(x); setSel(null); }} style={[s.pill, x === site ? s.pillOn : null]}>
              <Text style={[s.pillText, x === site ? { color: '#FFFFFF' } : null]}>{x}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => setTab('todo')} style={[s.pill, tab === 'todo' ? s.pillOn : null]}><Text style={[s.pillText, tab === 'todo' ? { color: '#FFFFFF' } : null]}>{'To mark ' + todo.length}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setTab('done')} style={[s.pill, tab === 'done' ? s.pillOn : null]}><Text style={[s.pillText, tab === 'done' ? { color: '#FFFFFF' } : null]}>{'Marked ' + done.length}</Text></Pressable>
      </View>
      {offline || queuedHere > 0 ? <Notice text={queuedHere > 0 ? `No signal. ${queuedHere} marks saved on this phone, will send when back online.` : 'No signal. Marks will be saved on this phone.'} /> : null}
      {note && !cur ? <Notice text={note} tone="bad" /> : null}
      {shown.length === 0 ? <Empty title={tab === 'todo' ? 'Everyone is marked' : 'No one marked yet'} /> : (
        <FlatList data={shown} keyExtractor={(e) => e.id} contentContainerStyle={{ gap: 8, paddingBottom: 24 }} initialNumToRender={20}
          renderItem={({ item }) => {
            const m = marks[item.id];
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => setSel(item.id)} style={[s.row, sel === item.id ? s.rowOn : null]}>
                <View style={{ flex: 1 }}><Text style={s.rowName} numberOfLines={1}>{item.name || item.id}</Text><Text style={s.rowId}>{item.id}</Text></View>
                {m ? <Chip label={(NAME[m.status] ?? m.status) + (m.pending ? ' · saved' : '')} tone={m.status === 'A' ? 'bad' : m.status === 'P' ? 'ok' : 'warn'} /> : <Text style={s.rowId}>Not marked</Text>}
              </Pressable>
            );
          }} />
      )}
    </View>
  );

  const detail = cur ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: short ? 10 : 14 }}>
      {!wide ? <Pressable accessibilityRole="button" accessibilityLabel="Back to list" onPress={() => setSel(null)} style={[s.pill, { alignSelf: 'flex-start' }]}><Text style={s.pillText}>‹ List</Text></Pressable> : null}
      <View style={s.who}>
        <View style={s.avatar}><Text style={s.avatarText}>{cur.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'}</Text></View>
        <View style={{ flex: 1 }}><Text style={s.whoName}>{cur.name || cur.id}</Text><Text style={s.rowId}>{cur.id + (cur.role ? ' · ' + cur.role : '')}</Text>
          {marks[cur.id] ? <Text style={s.rowId}>{'Marked: ' + (NAME[marks[cur.id].status] ?? marks[cur.id].status)}</Text> : null}</View>
      </View>
      {note ? <Notice text={note} tone="bad" /> : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Btn label="Present" onPress={() => mark(cur, 'P')} style={s.big} />
        <Btn label="Absent" kind="danger" onPress={() => mark(cur, 'A')} style={s.big} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {STATUSES.map((x) => <Btn key={x.code} label={x.label} kind="plain" onPress={() => mark(cur, x.code)} style={s.small} />)}
      </View>
      <View style={s.ot}>
        <Text style={s.rowName}>Overtime</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Less overtime" onPress={() => setOt((v) => Math.max(0, v - 1))} style={s.step}><Text style={s.stepText}>−</Text></Pressable>
          <Text style={s.otVal}>{ot + ' h'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="More overtime" onPress={() => setOt((v) => Math.min(12, v + 1))} style={s.step}><Text style={s.stepText}>+</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  ) : null;

  if (wide) return <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.ground }}>{list}<View style={s.pane}>{detail ?? <Empty title="Pick a worker" body="Their details open here, beside the list." />}</View></View>;
  return <View style={{ flex: 1, backgroundColor: C.ground }}>{detail ?? list}</View>;
}
const s = StyleSheet.create({
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.card, justifyContent: 'center' },
  pillOn: { backgroundColor: C.ink },
  pillText: { fontSize: 13, fontWeight: '600', color: C.ink },
  row: { minHeight: 60, borderRadius: 16, backgroundColor: C.card, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.card },
  rowOn: { borderColor: C.teal },
  rowName: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowId: { fontSize: 12, color: C.muted, marginTop: 2 },
  pane: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.line },
  who: { backgroundColor: C.card, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.teal, fontSize: 24, fontWeight: '700' },
  whoName: { fontSize: 20, fontWeight: '700', color: C.ink },
  big: { flex: 1, minHeight: 88, borderRadius: 22 },
  small: { flex: 1, minHeight: 50, borderRadius: 14, paddingHorizontal: 4 },
  ot: { backgroundColor: C.card, borderRadius: 18, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.ground, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, color: C.ink },
  otVal: { fontSize: 18, fontWeight: '700', color: C.ink, minWidth: 40, textAlign: 'center' },
});
