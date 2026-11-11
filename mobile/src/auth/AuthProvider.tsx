import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, authCall, onUnauthorized, revokeSession } from '@/api/client';
import type { Profile } from '@/api/types';
import { clearToken, readToken, writeToken } from './token';

type State = { status: 'restoring' } | { status: 'signed-out' } | { status: 'signed-in'; profile: Profile };

interface AuthApi {
  state: State;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns 'signed-in', or 'verify' when the server requires e-mail confirmation first. */
  signUp: (name: string, email: string, password: string) => Promise<'signed-in' | 'verify'>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (p: Profile) => void;
}

const Ctx = createContext<AuthApi | null>(null);

/**
 * Uses the existing Better Auth accounts (same users and sessions as theprivate.in). The session
 * token is kept in the platform keystore; the server remains the only authority on who is signed in.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'restoring' });

  const loadProfile = useCallback(async () => {
    try {
      const profile = await api<Profile>('/api/mobile/v1/me');
      setState({ status: 'signed-in', profile });
    } catch (e) {
      // Offline at start-up: keep the token, show signed-out UI only if the server rejected it.
      if (e instanceof ApiError && e.status === 401) setState({ status: 'signed-out' });
      else if (await readToken()) setState((s) => (s.status === 'signed-in' ? s : { status: 'signed-out' }));
      else setState({ status: 'signed-out' });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (await readToken()) await loadProfile();
      else setState({ status: 'signed-out' });
    })();
    return onUnauthorized(() => setState({ status: 'signed-out' }));
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token } = await authCall('/sign-in/email', { email: email.trim().toLowerCase(), password });
      if (!token) throw new ApiError('NO_SESSION', 'We could not sign you in. Please try again.', 500);
      await writeToken(token);
      await loadProfile();
    },
    [loadProfile],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { token } = await authCall('/sign-up/email', { name: name.trim(), email: email.trim().toLowerCase(), password, callbackURL: '/account' });
      if (!token) return 'verify' as const;
      await writeToken(token);
      await loadProfile();
      return 'signed-in' as const;
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    const token = await readToken();
    await clearToken();
    setState({ status: 'signed-out' });
    if (token) await revokeSession(token);
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      state,
      profile: state.status === 'signed-in' ? state.profile : null,
      signIn,
      signUp,
      signOut,
      refresh: loadProfile,
      setProfile: (profile) => setState({ status: 'signed-in', profile }),
    }),
    [state, signIn, signUp, signOut, loadProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
