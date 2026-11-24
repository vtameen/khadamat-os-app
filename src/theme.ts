// The look approved on 24 Nov 2026 (design canvas "Khadamat OS staff app — redesign"):
// Apple's interface principles, with sizes and spacing on golden-ratio steps (×1.618).
import { Platform, TextStyle } from 'react-native';

export const C = {
  ground: '#F2F2F7',      // iOS grouped background
  card: '#FFFFFF',
  ink: '#1C1C1E',         // labels
  ink2: '#3A3A3C',
  muted: '#6C6C70',       // secondary text, passes 4.5:1 on both grounds
  faint: '#AEAEB2',       // chevrons
  line: 'rgba(60,60,67,0.20)',
  fill: 'rgba(118,118,128,0.12)',   // segmented-control track, search field
  teal: '#0B6B63',        // the one tint: action, done
  tealPress: '#08524C',
  tealTint: '#DDEFEC', onTealSoft: '#CDE9E5',
  amber: '#8A5300', amberTint: '#FFF1D6',   // today, check
  red: '#B3261E', redTint: '#FDE7E5',       // problem, late
  blue: '#0A5BC4', blueTint: '#E3EEFD',     // sign, new
  indigo: '#4B4FB8', orange: '#B35C00', grey: '#6C6C70',
  track: '#E5E5EA',
  coral: '#B3261E', coralTint: '#FDE7E5',   // older screens' names for red
  bar: 'rgba(249,249,249,0.82)',
  barLine: 'rgba(60,60,67,0.29)',
};

/** 5 · 8 · 13 · 21 · 34 · 55 — the Fibonacci steps (each ≈ 1.618 × the one before). */
export const S = { xs: 5, s: 8, m: 13, l: 21, xl: 34, xxl: 55 };
export const R = { card: 21, inner: 13, chip: 999, icon: 9 };
export const PHI = 1.618;

const font = Platform.select({ ios: undefined, android: 'sans-serif', default: undefined });
/** Type steps: 55 key figure · 34 screen title · 21 section · 17 body · 13 caption. Large text tightened. */
export const T: Record<'hero' | 'title' | 'title2' | 'section' | 'body' | 'bodyStrong' | 'sub' | 'caption' | 'kicker' | 'tab', TextStyle> = {
  hero: { fontSize: 55, lineHeight: 58, fontWeight: '700', letterSpacing: -1.2, color: C.ink, fontFamily: font },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.4, color: C.ink, fontFamily: font },
  title2: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, color: C.ink, fontFamily: font },
  section: { fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.35, color: C.ink, fontFamily: font },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, color: C.ink, fontFamily: font },
  bodyStrong: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: '600', color: C.ink, fontFamily: font },
  sub: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24, color: C.muted, fontFamily: font },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: C.muted, fontFamily: font },
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase', color: C.muted, fontFamily: font },
  tab: { fontSize: 11, lineHeight: 13, fontWeight: '500', color: C.muted, fontFamily: font },
};
export const NUM: TextStyle = { fontVariant: ['tabular-nums'] };

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | '';
export function toneColors(t: Tone): { bg: string; fg: string } {
  if (t === 'bad') return { bg: C.redTint, fg: C.red };
  if (t === 'warn') return { bg: C.amberTint, fg: C.amber };
  if (t === 'ok') return { bg: C.tealTint, fg: C.teal };
  return { bg: C.blueTint, fg: C.blue };
}
