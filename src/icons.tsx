import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Thin line icons from the approved mockups (24 Nov 2026). Stroke only, rounded ends.
export type IconName =
  | 'today' | 'approvals' | 'alerts' | 'me' | 'chevron' | 'back' | 'attendance' | 'pin' | 'camera' | 'list' | 'doc'
  | 'faceid' | 'lock' | 'bell' | 'clock' | 'check' | 'warn' | 'scan' | 'more' | 'transfer' | 'building' | 'close' | 'pen' | 'search';

export function Icon({ name, size = 24, color = '#1C1C1E', stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: React.ReactNode;
  switch (name) {
    case 'today': body = <><Circle cx={12} cy={12} r={4} {...p} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} /></>; break;
    case 'approvals': case 'pen': body = <><Path d="M4 19c3-1 4-6 6-6s1 4 3 4 2-3 4-3 2 2 3 2" {...p} /><Path d="M4 22h16" {...p} /></>; break;
    case 'alerts': case 'bell': body = <><Path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z" {...p} /><Path d="M10 21a2 2 0 0 0 4 0" {...p} /></>; break;
    case 'me': body = <><Circle cx={12} cy={9} r={3.5} {...p} /><Circle cx={12} cy={12} r={9.5} {...p} /><Path d="M6 19c1.5-2.5 3.6-3.5 6-3.5s4.5 1 6 3.5" {...p} /></>; break;
    case 'chevron': body = <Path d="M9 5l7 7-7 7" {...p} />; break;
    case 'back': body = <Path d="M15 5l-7 7 7 7" {...p} />; break;
    case 'close': body = <Path d="M6 6l12 12M18 6L6 18" {...p} />; break;
    case 'attendance': body = <><Path d="M9 11l2 2 4-4" {...p} /><Rect x={4} y={4} width={16} height={16} rx={4} {...p} /></>; break;
    case 'pin': body = <><Path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" {...p} /><Circle cx={12} cy={10} r={2.2} {...p} /></>; break;
    case 'camera': body = <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} /><Circle cx={12} cy={13} r={3.5} {...p} /></>; break;
    case 'list': body = <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" {...p} />; break;
    case 'doc': body = <><Path d="M7 3h7l5 5v13H7z" {...p} /><Path d="M14 3v5h5" {...p} /></>; break;
    case 'faceid': body = <><Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" {...p} /><Path d="M9 9v1.2M15 9v1.2M12 9v4h-1M9.2 16c1.5 1 4.1 1 5.6 0" {...p} /></>; break;
    case 'lock': body = <><Rect x={5} y={11} width={14} height={10} rx={2} {...p} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} /></>; break;
    case 'clock': body = <><Path d="M12 7v5l3 2" {...p} /><Circle cx={12} cy={12} r={8.5} {...p} /></>; break;
    case 'check': body = <Path d="M5 12l4 4 10-10" {...p} />; break;
    case 'warn': body = <><Path d="M12 3l10 18H2z" {...p} /><Path d="M12 10v4M12 17h.01" {...p} /></>; break;
    case 'scan': body = <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8" {...p} />; break;
    case 'more': body = <><Circle cx={5} cy={12} r={1.6} fill={color} /><Circle cx={12} cy={12} r={1.6} fill={color} /><Circle cx={19} cy={12} r={1.6} fill={color} /></>; break;
    case 'transfer': body = <Path d="M7 7h10l-3-3M17 17H7l3 3" {...p} />; break;
    case 'building': body = <><Path d="M5 21V5a1 1 0 0 1 1-1h9l4 4v13" {...p} /><Path d="M14 13h.01M3 21h18" {...p} /></>; break;
    case 'search': body = <><Circle cx={11} cy={11} r={6.5} {...p} /><Path d="M20 20l-4.2-4.2" {...p} /></>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">{body}</Svg>;
}
