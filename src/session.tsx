import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError, OfflineError } from './api';
import { unregisterPush } from './push';
import { askPhone, dropKey, forgetThisPhone, lockAfterMinutes, rememberThisPhone, storedKey, unlockEnabled } from './device';

export type User = {
  id: string; name?: string; username?: string; email?: string;
  isOwner?: boolean; canExec?: boolean; mustChange?: boolean;
  modules?: string[]; access?: Record<string, unknown>; sites?: string[];
};
type LoginResult = { ok: true } | { ok: false; need2fa?: 'verify' | 'setup'; error?: string };
type UnlockResult = { ok: boolean; error?: string; signedOut?: boolean };
type Ctx = {
  user: User | null; ready: boolean; offline: boolean;
  /** This phone has a key: show the unlock screen, not the sign-in form. */
  locked: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2fa: (code: string) => Promise<LoginResult>;
  unlock: () => Promise<UnlockResult>;
  logout: () => Promise<void>;
  /** Drop the phone key and go to the password sign-in ("Not you?"). */
  switchUser: () => Promise<void>;
  refresh: () => Promise<void>;
};
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [locked, setLocked] = useState(false);
  const bgAt = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User }>('/me');
      setUser(r.user ?? (r as unknown as User)); setOffline(false);
    } catch (e) {
      if (e instanceof OfflineError) setOffline(true);
      else setUser(null);
    }
  }, []);

  // Start: a phone with a key opens on the unlock screen; otherwise check the session.
  useEffect(() => {
    void (async () => {
      const k = (await unlockEnabled()) ? await storedKey() : null;
      if (k) setLocked(true);
      else await refresh();
      setReady(true);
    })();
  }, [refresh]);

  // Coming back after a while in the background asks the phone again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'background') { bgAt.current = Date.now(); return; }
      if (st !== 'active' || bgAt.current === null) return;
      const away = Date.now() - bgAt.current; bgAt.current = null;
      if (away >= (await lockAfterMinutes()) * 60000 && (await unlockEnabled()) && (await storedKey())) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  const signedIn = (u: User) => { setUser(u); setLocked(false); void rememberThisPhone(); };
  const handle = (r: any): LoginResult => {
    if (r && r.user) { signedIn(r.user); return { ok: true }; }
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

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    const phone = await askPhone();
    if (!phone.ok) return { ok: false, error: phone.cancelled ? undefined : 'The phone could not confirm it is you. Try again, or use the passcode.' };
    const k = await storedKey();
    if (!k) { setLocked(false); return { ok: false, signedOut: true }; }
    try {
      const r = await api<{ user: User }>('/app/device/resume', { token: k });
      setUser(r.user); setLocked(false); setOffline(false);
      return { ok: true };
    } catch (e) {
      if (e instanceof OfflineError) return { ok: false, error: 'No connection. Try again when you have signal.' };
      // The key no longer works (signed out elsewhere, revoked, password changed, 90 days idle).
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await dropKey(); setLocked(false); setUser(null);
        return { ok: false, signedOut: true, error: e.message };
      }
      return { ok: false, error: e instanceof ApiError ? e.message : 'Could not open. Try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await forgetThisPhone();
    await unregisterPush();
    try { await api('/logout', {}); } catch { /* best effort */ }
    setUser(null); setLocked(false);
  }, []);
  const switchUser = useCallback(async () => { await dropKey(); setLocked(false); setUser(null); }, []);

  return <SessionCtx.Provider value={{ user, ready, offline, locked, login, verify2fa, unlock, logout, switchUser, refresh }}>{children}</SessionCtx.Provider>;
}
export function useSession(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('SessionProvider missing');
  return c;
}
