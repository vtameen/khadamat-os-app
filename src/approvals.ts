import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { api, ApiError, OfflineError, SITE } from './api';
import { b64ToBytes, Box, Placement, stampLpoBox, stampPlacements } from './sign/stamp';
import { loadWork, WorkItem } from './work';

// Everything waiting for this person's decision that the app can show and sign
// itself (Ameen, 24 Nov 2026: no website pages inside the app):
//   LPO sign-off          /api/lpo/*            signature stamped into the box here, then uploaded
//   Payment requests      /api/payreq/sign/*    server records the signature (no file)
//   Tasks › Signatures    /api/sign/*           signature placed where the person taps
// Other decisions (transfers, revisions…) join as their screens are built.

export type Kind = 'lpo' | 'payreq' | 'doc';
export type Approval = { kind: Kind; id: string; kicker: string; title: string; sub: string; tone: 'ok' | 'warn' | 'bad' | 'info'; days: number; pill: string };

const LPO_BOX = ['', 'Prepared By', 'Checked and Verified', 'Approved By', 'APPROVED BY', 'Vehicle Approval'];
export const lpoBoxName = (lv: number) => LPO_BOX[lv] ?? 'your box';

export async function loadApprovals(meId: string): Promise<Approval[]> {
  const [work, sign] = await Promise.all([
    loadWork().catch((e) => { if (e instanceof OfflineError) throw e; return [] as WorkItem[]; }),
    api<{ data?: any[] }>('/sign/list').catch((e) => { if (e instanceof OfflineError) throw e; return { data: [] }; }),
  ]);
  const out: Approval[] = [];
  for (const w of work) {
    const late = w.days !== null && w.days < 0 ? -w.days : 0;
    if (w.id.startsWith('lpo:') && /^Sign LPO /.test(w.title)) {
      const [no, supplier] = w.title.replace(/^Sign LPO /, '').split(' · ');
      out.push({ kind: 'lpo', id: w.id.slice(4), kicker: 'LPO', title: no ?? 'LPO', sub: [supplier, w.sub].filter(Boolean).join(' · '), tone: late ? 'bad' : 'info', days: late, pill: late ? 'Waiting' : 'Sign' });
    } else if (w.id.startsWith('payreqsign:') && /^Sign payment request /.test(w.title)) {
      const [no, payee] = w.title.replace(/^Sign payment request /, '').split(' · ');
      out.push({ kind: 'payreq', id: w.id.slice('payreqsign:'.length), kicker: 'Payment request', title: no ?? 'Payment request', sub: [payee, w.sub].filter(Boolean).join(' · '), tone: late ? 'bad' : 'info', days: late, pill: late ? 'Waiting' : 'Sign' });
    }
  }
  for (const r of sign.data ?? []) {
    if (!r || r.status !== 'pending' || String(r.signerId ?? '') !== meId) continue;
    out.push({ kind: 'doc', id: String(r.id), kicker: 'Document to sign', title: String(r.title || r.file?.name || 'Document'),
      sub: 'From ' + String(r.senderName ?? '') + (r.note ? ' · ' + String(r.note) : ''), tone: 'info', days: 0, pill: 'Sign' });
  }
  return out.sort((a, b) => b.days - a.days);
}

// ── files ────────────────────────────────────────────────────────────────────
/** Download a file the signed-in person may see, keep it in the app's cache, return its bytes and local uri. */
export async function fetchFile(path: string, name: string): Promise<{ bytes: Uint8Array; uri: string }> {
  let res: Response;
  try { res = await fetch(SITE + path, { credentials: 'include' }); } catch { throw new OfflineError(); }
  if (!res.ok) {
    let msg = 'Could not open the document (' + res.status + ')';
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* not JSON */ }
    throw new ApiError(res.status, msg);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, uri: await toCache(bytes, name) };
}
export async function toCache(bytes: Uint8Array, name: string): Promise<string> {
  if (Platform.OS === 'web') return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const f = new File(Paths.cache, Date.now() + '-' + name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80));
  f.create({ overwrite: true });
  await f.write(bytes);
  return f.uri;
}
async function upload(route: string, fields: Record<string, string>, bytes: Uint8Array, name: string): Promise<any> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (Platform.OS === 'web') fd.append('file', new Blob([bytes as BlobPart], { type: 'application/pdf' }), name);
  else fd.append('file', { uri: await toCache(bytes, name), name, type: 'application/pdf' } as unknown as Blob);
  let res: Response;
  try { res = await fetch(SITE + '/api' + route, { method: 'POST', credentials: 'include', body: fd }); } catch { throw new OfflineError(); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, j.error || 'Upload failed (' + res.status + ')');
  return j;
}
/** The person's own saved signature (set on the website or by the admin). */
export async function mySignature(): Promise<{ png: Uint8Array; dataUrl: string } | null> {
  const j = await api<{ png?: string }>('/sign/signature');
  if (!j?.png) return null;
  return { png: b64ToBytes(j.png), dataUrl: j.png };
}

// ── LPO ──────────────────────────────────────────────────────────────────────
export type LpoDoc = {
  id: string; lpoNo: string; supplier: string; amount: number; unitLabel?: string; description?: string; status: string;
  cur: number; curUser: string; curFile: string; mine: boolean; _ver: number; test?: boolean;
  boxes: Box[]; docs: Array<{ f: string; name: string }>; chain: Array<{ level: number; name: string }>;
  signs: Array<{ level: number; name: string; at: string }>;
};
export const lpoFileUrl = (f: string, id: string) => '/api/lpo/file?f=' + encodeURIComponent(f) + '&id=' + encodeURIComponent(id);
export async function loadLpo(id: string): Promise<LpoDoc> {
  const r = await api<{ doc: LpoDoc }>('/lpo/doc?id=' + encodeURIComponent(id));
  return r.doc;
}
export function lpoNext(d: LpoDoc): { level: number; name: string } | null {
  const i = (d.chain ?? []).map((c) => c.level).indexOf(d.cur);
  return i >= 0 ? d.chain[i + 1] ?? null : null;
}
export async function signLpo(d: LpoDoc, currentPdf: Uint8Array, sig: Uint8Array, myName: string, note: string): Promise<void> {
  const box = (d.boxes ?? []).find((b) => b.level === d.cur);
  if (!box) throw new Error('This LPO has no box for your level. Ask the procurement officer.');
  const signed = await stampLpoBox(currentPdf, box, sig, myName);
  const fname = (d.lpoNo || 'LPO').replace(/[/\\]/g, '-') + ' - signed L' + d.cur + '.pdf';
  const up = await upload('/lpo/upload', { kind: 'signed' }, signed, fname);
  const f = up?.file?.f;
  if (!f) throw new Error('Your signed copy did not upload. Try again.');
  await api('/lpo/sign', { id: d.id, ver: d._ver, file: f, note });
}
export async function lpoDecline(d: LpoDoc, how: 'return' | 'reject', note: string): Promise<void> {
  await api('/lpo/' + how, { id: d.id, ver: d._ver, note });
}

// ── Payment requests ─────────────────────────────────────────────────────────
export type PayReq = {
  id: string; reqNo: string; date: string; division: string; site?: string; total: number; status: string; _v: number;
  urgent?: boolean; advance?: boolean; comments?: string;
  lines: Array<{ desc: string; chequeName: string; amount: number; invNo?: string; remarks?: string }>;
  files?: Array<{ f: string; name: string }>;
  so?: { state?: string; cur?: number; curUser?: string; steps?: Array<{ box: number; label: string; u: string; name: string }>; signs?: Array<{ box: number; name: string; at: string }> };
};
export async function loadPayReq(id: string): Promise<PayReq> {
  return (await api<{ data: PayReq }>('/payreq/get?id=' + encodeURIComponent(id))).data;
}
export const payreqFileUrl = (f: string, id: string) => '/api/payreq/file?f=' + encodeURIComponent(f) + '&id=' + encodeURIComponent(id);
export async function signPayReq(r: PayReq, note: string): Promise<void> { await api('/payreq/sign/sign', { id: r.id, _v: r._v, note }); }
export async function payReqDecline(r: PayReq, how: 'return' | 'reject' | 'docs', note: string): Promise<void> {
  await api('/payreq/sign/' + how, { id: r.id, _v: r._v, note });
}

// ── Tasks › Signatures ───────────────────────────────────────────────────────
export type SignReq = { id: string; title: string; senderId: string; senderName: string; status: string; note?: string; file: { stored: string; name: string } };
export async function loadSignReq(id: string): Promise<SignReq> {
  const r = await api<{ data?: SignReq[] }>('/sign/list');
  const x = (r.data ?? []).find((q) => String(q.id) === id);
  if (!x) throw new ApiError(404, 'This document is no longer waiting for you.');
  return x;
}
export const signFileUrl = (stored: string, name: string) => '/api/sign/file?f=' + encodeURIComponent(stored) + '&name=' + encodeURIComponent(name);
export async function signDoc(r: SignReq, pdf: Uint8Array, placements: Placement[], sig: Uint8Array, me: { id: string; name: string }, addDate: boolean): Promise<void> {
  const out = await stampPlacements(pdf, placements, sig, me.name, addDate);
  const base = (r.file?.name || 'document.pdf').replace(/\.pdf$/i, '');
  const up = await upload('/sign/upload', {}, out, base + ' - signed.pdf');
  if (!up?.file) throw new Error('The signed copy did not upload. Try again.');
  await api('/sign/complete', { id: r.id, file: up.file });
  if (r.senderId && r.senderId !== me.id) {   // same note the website sends
    try {
      await api('/notify', { type: 'SIGN_DONE', title: 'Document signed: ' + (r.title || ''), body: me.name + ' signed and returned the document.',
        link: '/tasks/#sign', audience: { roles: [], sites: [], userIds: [r.senderId] } });
    } catch { /* the bell note is a courtesy */ }
  }
}
export async function declineDoc(r: SignReq, reason: string): Promise<void> { await api('/sign/decline', { id: r.id, reason }); }
