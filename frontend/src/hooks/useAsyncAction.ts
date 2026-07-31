import { useState } from "react";

/**
 * Guards an async action against a second click/tap while the first call is
 * still in flight — the same double-submit-guard shape that kept getting
 * hand-inlined per form. The action owns its own error handling; this hook
 * only tracks whether one is currently running.
 */
export function useAsyncAction<Args extends unknown[]>(action: (...args: Args) => Promise<void> | void) {
  const [busy, setBusy] = useState(false);

  const run = async (...args: Args) => {
    if (busy) return;
    setBusy(true);
    try {
      await action(...args);
    } finally {
      setBusy(false);
    }
  };

  return [busy, run] as const;
}

/**
 * Same guard as useAsyncAction, but keyed — for a list where each row has
 * its own independent action (e.g. approving one order shouldn't block
 * approving a different one, only a second click on the *same* row).
 */
export function useKeyedAsyncAction<K, Args extends unknown[]>(
  action: (key: K, ...args: Args) => Promise<void> | void
) {
  const [busyKeys, setBusyKeys] = useState<Set<K>>(new Set());

  const run = async (key: K, ...args: Args) => {
    if (busyKeys.has(key)) return;
    setBusyKeys((prev) => new Set(prev).add(key));
    try {
      await action(key, ...args);
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const isBusy = (key: K) => busyKeys.has(key);

  return { isBusy, run };
}
