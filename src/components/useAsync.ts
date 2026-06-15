import { useCallback, useEffect, useState } from 'react';
import type { WidgetStatus } from './WidgetFrame';

export interface AsyncState<T> {
  status: WidgetStatus;
  data: T | undefined;
  error: unknown;
  reload: () => void;
}

/**
 * Runs an async loader (typically a DataProvider call) and tracks
 * loading/error/ready state for WidgetFrame. Ignores stale results on unmount or
 * reload. `status` is never 'empty' here — widgets decide emptiness from `data`.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ status: WidgetStatus; data?: T; error?: unknown }>({
    status: 'loading',
  });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    loader().then(
      (data) => active && setState({ status: 'ready', data }),
      (error) => active && setState({ status: 'error', error }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { status: state.status, data: state.data, error: state.error, reload };
}
