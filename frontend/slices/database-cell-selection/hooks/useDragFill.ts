import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface FillSource {
  rowId: string;
  propId: string;
  rowIndex: number;
}

interface Options {
  rowIds: string[];
  onFill: (source: FillSource, targetRowIds: string[]) => void;
}

export function useDragFill({ rowIds, onFill }: Options) {
  const [source, setSource] = useState<FillSource | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const sourceRef = useRef<FillSource | null>(null);
  sourceRef.current = source;

  const start = useCallback((s: FillSource) => {
    setSource(s);
    setTargetIndex(s.rowIndex);
  }, []);

  useEffect(() => {
    if (!source) return;
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const rowEl = el?.closest<HTMLElement>("[data-fill-row-id]");
      if (!rowEl) return;
      const rid = rowEl.dataset.fillRowId;
      if (!rid) return;
      const idx = rowIds.indexOf(rid);
      if (idx >= 0) setTargetIndex(idx);
    };
    const onUp = () => {
      const s = sourceRef.current;
      if (s && targetIndex !== null) {
        const start = Math.min(s.rowIndex, targetIndex);
        const end = Math.max(s.rowIndex, targetIndex);
        const targets = rowIds.slice(start, end + 1).filter((id) => id !== s.rowId);
        if (targets.length) onFill(s, targets);
      }
      setSource(null);
      setTargetIndex(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [source, targetIndex, rowIds, onFill]);

  const isInFillRange = useCallback(
    (rowIndex: number, propId: string) => {
      if (!source || targetIndex === null || source.propId !== propId) return false;
      const lo = Math.min(source.rowIndex, targetIndex);
      const hi = Math.max(source.rowIndex, targetIndex);
      return rowIndex >= lo && rowIndex <= hi;
    },
    [source, targetIndex],
  );

  // Stable identity while not filling so the `fill` prop doesn't defeat
  // React.memo on every row on unrelated re-renders. `start`/`isInFillRange`
  // are already useCallback-stable; only `source` changes identity.
  return useMemo(
    () => ({ source, start, isInFillRange, isFilling: !!source }),
    [source, start, isInFillRange],
  );
}
