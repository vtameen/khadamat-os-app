import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, OfflineError } from './api';

export type User = {
  id: string; name?: string; username?: string; email?: string;
  isOwner?: boolean; canExec?: boolean; mustChange?: boolean;
  modules?: string[]; access?: Record<string, unknown>; sites?: string[];
};
type LoginResult = { ok: true } | { ok: false; need2fa?: 'verify' | 'setup'; error?: string };
type Ctx = {
  user: User | null; ready: boolean; offline: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2fa: (code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User }>('/me');
      setUser(r.user ?? (r as unknown as User)); setOffline(false);
    } catch (e) {
      if (e instanceof OfflineError) setOffline(true);
      else setUser(null);
    } finally { setReady(true); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const handle = (r: any): LoginResult => {
    if (r && r.user) { setUser(r.user); return { ok: true }; }
    if (r && r.need2fa) return { ok: false, need2fa: r.need2fa };
    return { ok: false, error: 'Sign-in failed' };
  };
  const fail = (e: unknown): LoginResult =>
    ({ ok: false, error: e instanceof ApiError ? e.message : e instanceof OfflineError ? 'No connection. Try again when you have signal.' : 'Sign-in failed' });

  const login = useCallback(async (username: string, password: string) => {
    try { return handle(await api('/login', { username: username.trim(), password })); } catch (e) { return fail(e); }
  }, []);
  const verify2fa = useCallback(async (code: string) => {
    try { return handle(await api('/login/2fa', { code: code.trim(), remember: true })); } catch (e) { return fail(e); }
  }, []);
  const logout = useCallback(async () => {
    try { await api('/push/unregister', {}); } catch { /* best effort */ }
    try { await api('/logout', {}); } catch { /* best effort */ }
    setUser(null);
  }, []);

  return <SessionCtx.Provider value={{ user, ready, offline, login, verify2fa, logout, refresh }}>{children}</SessionCtx.Provider>;
}
export function useSession(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('SessionProvider missing');
  return c;
}
