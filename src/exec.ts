import { api } from './api';
import type { IconName } from './icons';
import { C, Tone } from './theme';

// Executive mode (Haneef and Ameen, 24 Nov 2026): every module to look at, nothing to
// edit except signing. Data comes from the same routes the web /exec/ page reads.

export type ToSign = { lpo: number; payreq: number; docs: number; materials: number; total: number };
export type ExecCamp = {
  id: string; code: string; label: string; lead: string;
  att: { marked: number; total: number; state: string };
  round: { state: string; issues: number; by: string };
  tickets: { live: number; overdue: number; verify: number; old48: number; today: number };
};
export type Need = { camp: string; t: string; s: string; tone: Tone };
export type SijilRow = { id: string; title: string; party: string; camp: string; refNo: string; expiry: string; days: number };
export type Brief = {
  date: string; toSign: ToSign;
  camps: { camps: ExecCamp[]; needs: Need[]; totals: { open: number; overdue: number; rounds: number; camps: number } } | null;
  sijil: SijilRow[];
};
export type Glimpse = { v?: string; u?: string; l?: string; tone?: string; pct?: number } | null;

export const loadBrief = () => api<Brief>('/exec/brief');
export async function loadSummary(): Promise<Record<string, Glimpse>> {
  const r = await api<any>('/home-summary');
  return (r && typeof r.summary === 'object' && r.summary) || r || {};
}

export type Ticket = { id: string; no: string; camp: string; campCode: string; source: string; category: string; priority: string; title: string;
  location: string; status: string; ownerName: string; createdTs: number; dueTs: number; overdue: boolean; focusMr?: string };
export async function campTickets(camp: string): Promise<Ticket[]> {
  const r = await api<{ rows?: Ticket[] }>('/campops/tickets?status=live&camp=' + encodeURIComponent(camp));
  return r.rows ?? [];
}

export type LpoRow = { id: string; lpoNo: string; supplier: string; amount: number; unitLabel: string; status: string; curName: string; lpoDate: string; since: string; test?: boolean; mine?: boolean };
export async function lpoList(): Promise<LpoRow[]> {
  const r = await api<{ data?: LpoRow[] }>('/lpo/list');
  return (r.data ?? []).filter((x) => !x.test);
}
export type PayReqRow = { id: string; reqNo: string; division: string; status: string; to: string; subject: string; site: string; total: number; date: string; submittedAt?: string };
export async function payreqList(): Promise<PayReqRow[]> {
  const r = await api<any>('/payreq/list');
  const rows: any[] = Array.isArray(r?.data) ? r.data : Array.isArray(r?.rows) ? r.rows : [];
  return rows.filter((x) => x && x.status !== 'draft').map((x) => ({
    id: String(x.id ?? ''), reqNo: String(x.reqNo ?? ''), division: String(x.division ?? ''), status: String(x.status ?? ''),
    to: String(x.to ?? ''), subject: String(x.subject ?? ''), site: String(x.site ?? ''), date: String(x.date ?? '').slice(0, 10),
    submittedAt: String(x.submittedAt ?? ''),
    total: Number(x.total) || (Array.isArray(x.lines) ? x.lines.reduce((a: number, l: any) => a + (Number(l?.amount) || 0), 0) : 0),
  })).sort((a, b) => (b.submittedAt || b.date).localeCompare(a.submittedAt || a.date));
}

/** The modules, in the order of the website's home. `detail` = has its own list screen in the app. */
export type ModuleDef = { key: string; label: string; icon: IconName; color: string; detail?: 'camps' | 'lpo' | 'payreq' | 'sijil' };
export const MODULES: ModuleDef[] = [
  { key: 'campops', label: 'Camp Ops', icon: 'building', color: C.teal, detail: 'camps' },
  { key: 'lpo', label: 'LPO Sign-off', icon: 'pen', color: C.blue, detail: 'lpo' },
  { key: 'payreq', label: 'Payment Requests', icon: 'doc', color: C.indigo, detail: 'payreq' },
  { key: 'attendance', label: 'Attendance', icon: 'attendance', color: C.teal },
  { key: 'almabar', label: 'Al Mabar', icon: 'attendance', color: C.orange },
  { key: 'waste', label: 'Site Visits', icon: 'pin', color: C.orange },
  { key: 'rfid', label: 'RFID Install', icon: 'scan', color: C.indigo },
  { key: 'property', label: 'Property', icon: 'building', color: C.blue },
  { key: 'masaar', label: 'Masaar Auto City', icon: 'building', color: C.grey },
  { key: 'receipts', label: 'Receipts', icon: 'doc', color: C.teal },
  { key: 'receivables', label: 'Receivables', icon: 'doc', color: C.blue },
  { key: 'pettycash', label: 'Petty Cash', icon: 'doc', color: C.amber },
  { key: 'profitability', label: 'Manpower', icon: 'list', color: C.indigo },
  { key: 'cleaning', label: 'Cleaning stock', icon: 'list', color: C.teal },
  { key: 'maintenance', label: 'Maintenance stock', icon: 'list', color: C.orange },
  { key: 'sijil', label: 'Sijil records', icon: 'doc', color: C.grey, detail: 'sijil' },
  { key: 'autodocs', label: 'AutoDocs', icon: 'doc', color: C.grey },
  { key: 'payslips', label: 'Payslips', icon: 'doc', color: C.grey },
  { key: 'tasks', label: 'Tasks', icon: 'list', color: C.indigo },
];

export const aed = (n: number) => 'AED ' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 27/Nov/2026, the date style used across Khadamat OS. */
export function dmy(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  return m ? m[3] + '/' + MON[Number(m[2]) - 1] + '/' + m[1] : ymd || '';
}
export function statusTone(s: string): Tone {
  if (['rejected', 'returned', 'overdue'].includes(s)) return 'bad';
  if (['pending', 'submitted', 'sent', 'received', 'open', 'in_progress'].includes(s)) return 'warn';
  if (['signed', 'issued', 'paid', 'closed', 'done', 'fixed'].includes(s)) return 'ok';
  return 'info';
}
export const statusLabel = (s: string) => (s ? s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');
