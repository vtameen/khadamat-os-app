import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, Tone, toneColors } from './theme';

export function Title({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={s.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Chip({ label, tone = 'info' }: { label: string; tone?: Tone }) {
  const t = toneColors(tone);
  return <View style={[s.chip, { backgroundColor: t.bg }]}><Text style={[s.chipText, { color: t.fg }]} numberOfLines={1}>{label}</Text></View>;
}
export function Btn({ label, onPress, kind = 'primary', disabled, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.teal : C.card;
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? C.coral : C.teal;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'danger' ? { borderWidth: 2, borderColor: C.coral } : null, style]}>
      <Text style={[s.btnText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
export function Label({ children }: { children: string }) { return <Text style={s.label}>{children}</Text>; }
export function Loading() { return <View style={s.center}><ActivityIndicator color={C.teal} /></View>; }
export function Empty({ title, body }: { title: string; body?: string }) {
  return <View style={s.center}><Text style={s.emptyTitle}>{title}</Text>{body ? <Text style={s.emptyBody}>{body}</Text> : null}</View>;
}
export function Notice({ text, tone = 'warn' }: { text: string; tone?: Tone }) {
  const t = toneColors(tone);
  return <View style={[s.notice, { backgroundColor: t.bg }]}><Text style={{ color: t.fg, fontSize: 13, fontWeight: '500' }}>{text}</Text></View>;
}
export function Progress({ pct }: { pct: number }) {
  return <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} /></View>;
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: C.ink },
  sub: { fontSize: 13, color: C.muted, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 16 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '600' },
  btn: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0.7, textTransform: 'uppercase' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: C.muted, textAlign: 'center' },
  notice: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.teal },
});
