import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';

export interface Loadable<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** GET with cancellation on unmount / dependency change. `path = null` skips the request. */
export function useApi<T>(path: string | null): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api<T>(path, { signal: ctrl.signal })
      .then((d) => mounted.current && !ctrl.signal.aborted && setData(d))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e instanceof ApiError && e.code === 'CANCELLED')) return;
        if (mounted.current) setError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
      })
      .finally(() => mounted.current && !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
