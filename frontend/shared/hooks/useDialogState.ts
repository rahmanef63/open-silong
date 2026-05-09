"use client";

import { useCallback, useState } from "react";

interface DialogState<TData = unknown> {
  /** Free-form state owned by the dialog (e.g. parsed file payload). */
  data: TData | null;
  /** True after a successful operation finished (show the "imported" view). */
  done: boolean;
  /** Free-form error message (already user-safe — usually from useAsyncError). */
  error: string | null;
}

interface DialogStateApi<TData> extends DialogState<TData> {
  setData: (next: TData | null) => void;
  setError: (msg: string | null) => void;
  markDone: () => void;
  /** Reset every field. Call from `onOpenChange(false)` so the next open
   *  starts fresh. */
  reset: () => void;
}

/** Collapses the `[parsed/payload, error, imported, reset()]` boilerplate
 *  in import/export/share dialogs. Generic over the dialog's payload shape.
 *
 *  Usage:
 *    const dlg = useDialogState<ParsedFile>();
 *    if (dlg.done) return <SuccessView … />;
 *    if (dlg.error) <Banner>{dlg.error}</Banner>
 *    <Button onClick={() => execute(async () => {
 *      const next = await parse(file); dlg.setData(next);
 *    })} />
 */
export function useDialogState<TData = unknown>(): DialogStateApi<TData> {
  const [state, setState] = useState<DialogState<TData>>({
    data: null,
    done: false,
    error: null,
  });

  const setData = useCallback((next: TData | null) => {
    setState((s) => ({ ...s, data: next, error: null }));
  }, []);

  const setError = useCallback((msg: string | null) => {
    setState((s) => ({ ...s, error: msg }));
  }, []);

  const markDone = useCallback(() => {
    setState((s) => ({ ...s, done: true, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, done: false, error: null });
  }, []);

  return { ...state, setData, setError, markDone, reset };
}
