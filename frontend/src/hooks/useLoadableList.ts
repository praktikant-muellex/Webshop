import { useCallback, useEffect, useState } from "react";

/**
 * Shared fetch/loading/error state machine for a page that lists data from
 * one endpoint. `fetcher` should be wrapped in `useCallback` by the caller
 * (with whatever filters/params it depends on) — this hook reloads whenever
 * `fetcher`'s identity changes, so that's how a caller controls "reload on
 * this filter changing" without this hook needing its own deps array.
 */
export function useLoadableList<T>(fetcher: () => Promise<T[]>, errorMessage: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetcher()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch(() => setError(errorMessage))
      .finally(() => setLoading(false));
  }, [fetcher, errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, setError, reload: load };
}
