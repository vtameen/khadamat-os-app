import { api } from './api';
import type { Tone } from './theme';

// One feed of "what needs you" across modules, served by the site (/api/v2/work).
export type WorkItem = {
  id: string; module: string; title: string; sub: string; tone: Tone;
  days: number | null; link: string; action: { label: string; href: string } | null;
};
const DECISION_MODULES = new Set(['lpo', 'payreq', 'contract_change', 'cc', 'einv', 'attendance', 'signatures']);

export async function loadWork(): Promise<WorkItem[]> {
  const r = await api<{ items?: any[] }>('/v2/work');
  return (r.items ?? []).map((x) => ({
    id: String(x.id ?? ''), module: String(x.module ?? ''), title: String(x.title ?? ''), sub: String(x.sub ?? ''),
    tone: (['ok', 'warn', 'bad'].includes(x.tone) ? x.tone : 'info') as Tone,
    days: typeof x.days === 'number' ? x.days : null,
    link: String(x.link ?? ''), action: x.action && x.action.href ? { label: String(x.action.label ?? 'Open'), href: String(x.action.href) } : null,
  }));
}
/** Items that are a decision waiting on this person (sign, approve, review). */
export function isDecision(w: WorkItem): boolean {
  const l = (w.action?.label ?? '').toLowerCase();
  return DECISION_MODULES.has(w.module) || l.includes('sign') || l.includes('approve') || l.includes('review');
}
export function moduleLabel(m: string): string {
  const map: Record<string, string> = { lpo: 'LPO', payreq: 'Payment request', contract_change: 'Contract change', cc: 'Contract change',
    einv: 'e-Invoicing', attendance: 'Attendance', sijil: 'Sijil', property: 'Property', pettycash: 'Petty cash', tasks: 'Task' };
  return map[m] ?? (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Item');
}
