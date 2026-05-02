import { useCallback, useRef } from "react";

/**
 * Per-block undo/redo history. Tracks text snapshots; consumer wires Cmd/Z + Cmd/Shift/Z.
 */
export function useBlockHistory(initialText: string) {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const lastPushed = useRef<string>(initialText);
  const lastPushTime = useRef<number>(0);

  const record = useCallback((text: string) => {
    const now = Date.now();
    // throttle: push at most every 500ms or on word boundary
    if (text === lastPushed.current) return;
    if (now - lastPushTime.current < 500 && !/\s$/.test(text)) {
      lastPushed.current = text; // still latest, but don't add a checkpoint
      return;
    }
    past.current.push(lastPushed.current);
    if (past.current.length > 100) past.current.shift();
    lastPushed.current = text;
    lastPushTime.current = now;
    future.current = [];
  }, []);

  const undo = useCallback((current: string): string | null => {
    const prev = past.current.pop();
    if (prev === undefined) return null;
    future.current.push(current);
    lastPushed.current = prev;
    return prev;
  }, []);

  const redo = useCallback((current: string): string | null => {
    const next = future.current.pop();
    if (next === undefined) return null;
    past.current.push(current);
    lastPushed.current = next;
    return next;
  }, []);

  return { record, undo, redo };
}
