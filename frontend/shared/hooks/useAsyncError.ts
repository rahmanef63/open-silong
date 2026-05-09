"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { reportError, type SanitizedError } from "../lib/error";

interface AsyncErrorState {
  /** True while an `execute` call is in flight. */
  pending: boolean;
  /** Sanitized error from the last failed attempt; cleared on next attempt. */
  error: SanitizedError | null;
}

interface AsyncErrorApi extends AsyncErrorState {
  /** Run an async operation. On throw: logs (dev only), categorises,
   *  shows a toast with the sanitized message, sets `error` state,
   *  and returns `undefined`. On success: returns the value. */
  execute<T>(fn: () => Promise<T>, opts?: { silent?: boolean }): Promise<T | undefined>;
  /** Manually clear the error (e.g. when the user dismisses a banner). */
  clear(): void;
}

/** Collapses the `try { … } catch (e) { reportError(...); toast.error(...) }`
 *  pattern that was repeated in 20+ sites. Provides `pending` flag for
 *  buttons to show spinners.
 *
 *  Usage:
 *    const { execute, pending, error } = useAsyncError("MyComponent.save");
 *    <Button disabled={pending} onClick={() =>
 *      execute(async () => { await mutate({...}); toast.success("Saved"); })
 *    } />
 */
export function useAsyncError(scope: string): AsyncErrorApi {
  const [state, setState] = useState<AsyncErrorState>({ pending: false, error: null });

  const execute = useCallback(async <T,>(fn: () => Promise<T>, opts?: { silent?: boolean }) => {
    setState({ pending: true, error: null });
    try {
      const value = await fn();
      setState({ pending: false, error: null });
      return value;
    } catch (err) {
      const safe = reportError(scope, err);
      if (!opts?.silent) toast.error(safe.message);
      setState({ pending: false, error: safe });
      return undefined;
    }
  }, [scope]);

  const clear = useCallback(() => {
    setState((s) => (s.error ? { ...s, error: null } : s));
  }, []);

  return { ...state, execute, clear };
}
