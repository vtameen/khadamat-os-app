// Colours and sizes taken from the approved mockups (light, teal accent).
export const C = {
  ground: '#F2F4F3', card: '#FFFFFF', ink: '#10201E', muted: '#54615F', line: '#E6EAE9',
  teal: '#0B6B63', tealTint: '#DDEFEC', onTealSoft: '#D6ECE9',
  amber: '#7A4F00', amberTint: '#FBEBCB', coral: '#9A3324', coralTint: '#FBE1DC',
  blue: '#1F5FA8', blueTint: '#DCE9F8', track: '#E0E5E4',
};
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | '';
export function toneColors(t: Tone): { bg: string; fg: string } {
  if (t === 'bad') return { bg: C.coralTint, fg: C.coral };
  if (t === 'warn') return { bg: C.amberTint, fg: C.amber };
  if (t === 'ok') return { bg: C.tealTint, fg: C.teal };
  return { bg: C.blueTint, fg: C.blue };
}
