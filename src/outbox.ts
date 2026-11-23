import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError, OfflineError } from './api';

// Marks made with no signal are kept on the phone and sent, oldest first, when the
// connection returns. A mark the server refuses (4xx) is dropped and reported, because
// retrying it forever never helps.
export type Queued = { id: string; path: string; body: Record<string, unknown>; label: string; at: number };
const KEY = 'khd_outbox_v1';
let listeners: Array<(n: number) => void> = [];
let flushing = false;

async function read(): Promise<Queued[]> {
  try { const s = await AsyncStorage.getItem(KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch { return []; }
}
async function write(q: Queued[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
  listeners.forEach((l) => l(q.length));
}
export function onOutboxChange(l: (n: number) => void): () => void {
  listeners.push(l);
  void read().then((q) => l(q.length));
  return () => { listeners = listeners.filter((x) => x !== l); };
}
export async function queued(): Promise<Queued[]> { return read(); }

/** Send now; if there is no signal, keep it for later. Returns 'sent' or 'queued'. */
export async function postOrQueue(path: string, body: Record<string, unknown>, label: string): Promise<'sent' | 'queued'> {
  try { await api(path, body); return 'sent'; } catch (e) {
    if (!(e instanceof OfflineError)) throw e;
    const q = await read();
    q.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), path, body, label, at: Date.now() });
    await write(q);
    return 'queued';
  }
}

export async function flush(): Promise<{ sent: number; left: number; refused: string[] }> {
  if (flushing) return { sent: 0, left: (await read()).length, refused: [] };
  flushing = true;
  let sent = 0; const refused: string[] = [];
  try {
    let q = await read();
    while (q.length) {
      const item = q[0];
      try { await api(item.path, item.body); sent++; } catch (e) {
        if (e instanceof OfflineError) break;
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) refused.push(item.label + ': ' + e.message);
        else break;
      }
      q = (await read()).filter((x) => x.id !== item.id);
      await write(q);
    }
    return { sent, left: q.length, refused };
  } finally { flushing = false; }
}
