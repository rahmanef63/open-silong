import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

type Rect = { x: number; y: number; w: number; h: number };

interface Props {
  /** Scroll container that hosts the selectable items. Marquee positions itself
   * relative to this element (which must be `position: relative`). */
  containerRef: RefObject<HTMLElement | null>;
  /** CSS selector matching items within the container that can be selected. */
  itemSelector: string;
  /** Extracts the id for an item element (typically from a data-* attribute). */
  getItemId: (el: HTMLElement) => string | undefined;
  /** Called whenever the marquee rect changes during drag.
   * `ids` are the items currently inside the rect (PLUS the additive baseline,
   * if Shift/Cmd was held at drag start). `additive` is whether the drag began
   * with a modifier key. */
  onSelect: (ids: string[], additive: boolean) => void;
  /** Optional callback fired once when a real drag starts (after threshold). */
  onDragStart?: (additive: boolean) => void;
  /** Optional callback fired on pointerup (or cancel/escape), regardless of drag. */
  onDragEnd?: () => void;
  /** Optional baseline ids to preserve when starting a non-additive drag.
   * Defaults to []. For additive (Shift/Cmd) drags, the existing selection is
   * read from `getBaseline()` if provided. */
  getBaseline?: () => string[];
  /** Pixels to drag before the marquee activates. Default 4. */
  threshold?: number;
  /** Extra "interactive target" selectors to skip on pointerdown
   * (anything else inside content-editable / inputs / radix popovers / grips
   * is already excluded). */
  skipSelector?: string;
}

/** Generic rubber-band drag-to-select overlay.
 *
 * Press pointer down in non-text, non-UI space inside `containerRef` → drag →
 * each item element matching `itemSelector` whose bounding rect overlaps the
 * rubber-band gets reported via `onSelect`. The overlay is a translucent rect
 * portal'd into the container.
 */
export function Marquee({
  containerRef, itemSelector, getItemId, onSelect, onDragStart, onDragEnd,
  getBaseline, threshold = 4, skipSelector,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const callbacksRef = useRef({ onSelect, onDragStart, onDragEnd, getBaseline });
  callbacksRef.current = { onSelect, onDragStart, onDragEnd, getBaseline };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = false;
    let armed = false;
    let startX = 0;
    let startY = 0;
    let baseSnapshot: string[] = [];
    let additive = false;

    const isInteractiveTarget = (t: HTMLElement): boolean => {
      if (t.isContentEditable) return true;
      if (t.closest("[contenteditable='true']")) return true;
      if (t.closest("button, a, input, textarea, select, [role='button'], [role='separator'], [role='menuitem'], [role='checkbox'], [role='radio'], [role='switch']")) return true;
      if (t.closest("[data-block-grip]")) return true;
      if (t.closest("[data-block-selection-toolbar]")) return true;
      if (t.closest("[data-row-selection-toolbar]")) return true;
      if (t.closest("[data-radix-popper-content-wrapper]")) return true;
      if (t.closest("[data-radix-portal]")) return true;
      if (t.closest("[data-cell-editing='true']")) return true;
      if (skipSelector && t.closest(skipSelector)) return true;
      return false;
    };

    const containerOrigin = () => {
      const cr = container.getBoundingClientRect();
      return { left: cr.left, top: cr.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === "touch") return;
      const target = e.target as HTMLElement;
      if (!container.contains(target)) return;
      if (isInteractiveTarget(target)) return;

      armed = true;
      additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const o = containerOrigin();
      startX = e.clientX - o.left + container.scrollLeft;
      startY = e.clientY - o.top + container.scrollTop;
      baseSnapshot = additive && callbacksRef.current.getBaseline
        ? callbacksRef.current.getBaseline()
        : [];
    };

    const beginIfThreshold = (e: PointerEvent): boolean => {
      if (active) return true;
      const o = containerOrigin();
      const curX = e.clientX - o.left + container.scrollLeft;
      const curY = e.clientY - o.top + container.scrollTop;
      const totalDx = Math.abs(curX - startX);
      const totalDy = Math.abs(curY - startY);
      if (totalDx < threshold && totalDy < threshold) return false;
      active = true;
      document.body.style.userSelect = "none";
      callbacksRef.current.onDragStart?.(additive);
      return true;
    };

    const collectHits = (mx: Rect): string[] => {
      const items = container.querySelectorAll<HTMLElement>(itemSelector);
      const o = containerOrigin();
      const hits = new Set(baseSnapshot);
      items.forEach((el) => {
        const id = getItemId(el);
        if (!id) return;
        const r = el.getBoundingClientRect();
        const ix = r.left - o.left + container.scrollLeft;
        const iy = r.top - o.top + container.scrollTop;
        const overlap =
          ix < mx.x + mx.w &&
          ix + r.width > mx.x &&
          iy < mx.y + mx.h &&
          iy + r.height > mx.y;
        if (overlap) hits.add(id);
      });
      return [...hits];
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!armed) return;
      if (!beginIfThreshold(e)) return;
      const o = containerOrigin();
      const curX = e.clientX - o.left + container.scrollLeft;
      const curY = e.clientY - o.top + container.scrollTop;
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      const mx: Rect = { x, y, w, h };
      setRect(mx);
      callbacksRef.current.onSelect(collectHits(mx), additive);
    };

    const finish = () => {
      const wasActive = active;
      armed = false;
      active = false;
      setRect(null);
      document.body.style.userSelect = "";
      if (wasActive) callbacksRef.current.onDragEnd?.();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (active || armed)) finish();
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    document.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.removeEventListener("keydown", onKey);
      document.body.style.userSelect = "";
    };
  }, [containerRef, itemSelector, getItemId, threshold, skipSelector]);

  if (!rect || !containerRef.current) return null;
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none absolute z-40 rounded-sm bg-brand/15 ring-1 ring-brand/60"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />,
    containerRef.current,
  );
}
