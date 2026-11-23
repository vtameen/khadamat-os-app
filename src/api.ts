// Thin client for the live Khadamat OS API. The session is the site's own cookie,
// which React Native keeps in the platform cookie store (shared with in-app web pages).
export const SITE = 'https://khadamatos.com';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
/** Thrown when the request never reached the server (no signal). */
export class OfflineError extends Error {
  constructor() { super('No connection'); }
}

export async function api<T = any>(path: string, body?: unknown, method?: 'GET' | 'POST'): Promise<T> {
  const m = method ?? (body === undefined ? 'GET' : 'POST');
  let res: Response;
  try {
    res = await fetch(SITE + '/api' + path, {
      method: m,
      credentials: 'include',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new OfflineError();
  }
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(res.status, (json && (json.error || json.message)) || 'Request failed (' + res.status + ')');
  return json as T;
}

export function todayYmd(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
