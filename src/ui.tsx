import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, NUM, R, S, T, Tone, toneColors } from './theme';
import { Icon, IconName } from './icons';

// Building blocks of the approved look. One filled button per screen; everything
// reacts the moment it is pressed (Apple: feedback on press, not on release).

/** A light tap you can feel, for save / sign / scan. Never fatal. */
export function tick(kind: 'light' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* no haptics on this device */ }
}

/** Kicker above a large title, e.g. TUESDAY 24 NOVEMBER, then the 34-pt title. */
export function LargeTitle({ title, kicker, sub, right }: { title: string; kicker?: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={s.titleRow}>
      <View style={{ flex: 1 }}>
        {kicker ? <Text style={T.kicker} numberOfLines={1}>{kicker}</Text> : null}
        <Text style={T.title} numberOfLines={2} accessibilityRole="header">{title}</Text>
        {sub ? <Text style={[T.sub, { marginTop: 2 }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}
/** Older screens' title, now in the new type. */
export function Title({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return <LargeTitle title={title} sub={sub} right={right} />;
}
export function Section({ title, children, style }: { title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      {title ? <Text style={[T.section, { marginLeft: 4, marginBottom: S.s }]} accessibilityRole="header">{title}</Text> : null}
      {children}
    </View>
  );
}
export function Caption({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.caption, style]}>{children}</Text>;
}
/** White rounded group of rows (iOS inset grouped list). */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.group, style]}>
      {kids.map((k, i) => <View key={i} style={i > 0 ? s.sep : null}>{k}</View>)}
    </View>
  );
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}
/** One row of a group: title, optional sub line, trailing accessory, chevron when it opens something. */
export function Row({ title, sub, right, onPress, chevron, strong, danger, minHeight = 44, icon }: {
  title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; chevron?: boolean; strong?: boolean; danger?: boolean; minHeight?: number;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[strong ? T.bodyStrong : T.body, danger ? { color: C.red } : null]} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={[T.caption, { marginTop: 1 }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron" size={14} color={C.faint} stroke={2.6} /> : null}
    </>
  );
  if (!onPress) return <View style={[s.row, { minHeight }]}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title + (sub ? ', ' + sub : '')} onPress={onPress}
      style={({ pressed }) => [s.row, { minHeight }, pressed ? { backgroundColor: '#E5E5EA' } : null]}>{body}</Pressable>
  );
}
/** Settings-style rounded colour square with a white glyph. */
export function IconSquare({ name, color, size = 34 }: { name: IconName; color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.26, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={name} size={Math.round(size * 0.6)} color="#FFFFFF" stroke={2} />
  </View>;
}
export function Pill({ label, tone = 'info' }: { label: string; tone?: Tone }) {
  const t = toneColors(tone);
  return <View style={[s.pill, { backgroundColor: t.bg }]}><Text style={[s.pillText, { color: t.fg }]} numberOfLines={1}>{label}</Text></View>;
}
export const Chip = Pill;

/** The one filled button on a screen: a 55-pt pill. */
export function PrimaryButton({ label, onPress, disabled, busy, icon, style }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy} onPress={() => { tick(); onPress(); }}
      style={({ pressed }) => [s.primary, { opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }], backgroundColor: pressed ? C.tealPress : C.teal }, style]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <>
        {icon ? <Icon name={icon} size={22} color="#FFFFFF" stroke={2} /> : null}
        <Text style={s.primaryText} numberOfLines={1}>{label}</Text>
      </>}
    </Pressable>
  );
}
/** Quiet buttons: white pill (secondary), outlined (send back / reject) or plain text. */
export function Btn({ label, onPress, kind = 'primary', disabled, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger' | 'outline' | 'text'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  if (kind === 'primary') return <PrimaryButton label={label} onPress={onPress} disabled={disabled} style={style} />;
  const fg = kind === 'danger' ? C.red : C.teal;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [kind === 'text' ? s.textBtn : s.quiet,
        kind === 'outline' || kind === 'danger' ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: fg } : null,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}>
      <Text style={[kind === 'text' ? T.body : s.quietText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
/** iOS segmented control. */
export function Segmented<K extends string>({ items, value, onChange }: { items: Array<{ key: K; label: string }>; value: K; onChange: (k: K) => void }) {
  return (
    <View style={s.segTrack} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it.key)} style={[s.seg, on ? s.segOn : null]}>
            <Text style={s.segText} numberOfLines={1}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
/** Back link at the top of a pushed screen. */
export function BackLink({ label, onPress, right }: { label: string; onPress: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Back to ' + label} onPress={onPress} hitSlop={10}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', minHeight: 44, opacity: pressed ? 0.5 : 1 }]}>
        <Icon name="back" size={24} color={C.teal} stroke={2.4} /><Text style={[T.body, { color: C.teal }]}>{label}</Text>
      </Pressable>
      {right}
    </View>
  );
}
/** Frosted bar pinned to the bottom; the page scrolls underneath it. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={[s.bottomWrap, { paddingBottom: Math.max(inset.bottom, S.m) + S.s }]}>
      {Platform.OS === 'web' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(249,249,249,0.94)' }]} />
        : <BlurView intensity={80} tint="systemChromeMaterialLight" style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? C.bar : 'transparent' }]} />}
      <View style={{ gap: S.s }}>{children}</View>
    </View>
  );
}
export function Label({ children }: { children: string }) { return <Text style={[T.kicker, { marginLeft: 4 }]}>{children}</Text>; }
export function Loading() { return <View style={s.center}><ActivityIndicator color={C.teal} /></View>; }
export function Empty({ title, body, icon }: { title: string; body?: string; icon?: IconName }) {
  return <View style={s.center}>
    {icon ? <View style={{ marginBottom: S.s }}><Icon name={icon} size={34} color={C.faint} /></View> : null}
    <Text style={[T.section, { textAlign: 'center' }]}>{title}</Text>
    {body ? <Text style={[T.sub, { textAlign: 'center', maxWidth: 320 }]}>{body}</Text> : null}
  </View>;
}
export function Notice({ text, tone = 'warn', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const t = toneColors(tone);
  return <View style={[s.notice, { backgroundColor: t.bg }]}>
    {icon ? <Icon name={icon} size={20} color={t.fg} stroke={2.2} /> : null}
    <Text style={[T.sub, { color: t.fg, flex: 1 }]}>{text}</Text>
  </View>;
}
export function Progress({ pct, color = C.teal, track = C.track }: { pct: number; color?: string; track?: string }) {
  return <View style={[s.track, { backgroundColor: track }]}><View style={[s.fill, { backgroundColor: color, width: `${Math.max(0, Math.min(100, pct))}%` }]} /></View>;
}
export function Figure({ value, unit, style }: { value: string; unit?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[T.hero, NUM, style]}>{value}{unit ? <Text style={{ fontSize: 21, fontWeight: '600', letterSpacing: -0.3 }}>{unit}</Text> : null}</Text>;
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: S.m },
  group: { backgroundColor: C.card, borderRadius: R.card, overflow: 'hidden' },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.m, paddingHorizontal: 16, paddingVertical: 11 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.chip, alignSelf: 'center' },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  primary: { minHeight: 55, borderRadius: R.chip, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S.s, paddingHorizontal: S.l },
  primaryText: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '600' },
  quiet: { minHeight: 50, borderRadius: R.chip, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.l },
  quietText: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  textBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: S.s },
  segTrack: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: 10, backgroundColor: C.fill },
  seg: { flex: 1, minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  segText: { fontSize: 13, fontWeight: '600', color: C.ink },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: S.m, paddingHorizontal: 20, overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.barLine },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.l, gap: S.xs },
  notice: { borderRadius: R.inner, paddingHorizontal: 16, paddingVertical: S.m, flexDirection: 'row', gap: S.m, alignItems: 'flex-start' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
