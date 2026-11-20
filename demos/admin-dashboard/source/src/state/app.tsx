import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdminApi, Session } from "../data/api";

interface AppState {
  api: AdminApi;
  session: Session | null;
  booting: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** bumps when data changes anywhere, so open pages reload */
  version: number;
  changed(): void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ api, children }: { api: AdminApi; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.currentSession().then(setSession).finally(() => setBooting(false));
  }, [api]);

  const signIn = useCallback(async (email: string, password: string) => setSession(await api.signIn(email, password)), [api]);
  const signOut = useCallback(async () => {
    await api.signOut();
    setSession(null);
  }, [api]);
  const changed = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ api, session, booting, signIn, signOut, version, changed }), [api, session, booting, signIn, signOut, version, changed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

export function useRole() {
  return useApp().session?.user.role ?? null;
}

type Load<T> = { data: T | undefined; error: unknown; loading: boolean; reload(): void };

/** Loads data, reloads when anything changes, ignores stale responses. */
export function useLoad<T>(fn: (api: AdminApi) => Promise<T>, deps: unknown[]): Load<T> {
  const { api, version } = useApp();
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ data: s.data, loading: true }));
    fn(api).then(
      (data) => live && setState({ data, loading: false }),
      (error) => live && setState({ error, loading: false }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, version, nonce, ...deps]);

  return { data: state.data, error: state.error, loading: state.loading, reload: () => setNonce((n) => n + 1) };
}
