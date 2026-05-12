import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

type Rect = { x: number; y: number; w: number; h: number };

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector: string;
  getItemId: (el: HTMLElement) => string | undefined;
  onSelect: (ids: string[], additive: boolean) => void;
  onDragStart?: (additive: boolean) => void;
  onDragEnd?: () => void;
  getBaseline?: () => string[];
  /** Pixels of movement before the marquee activates from a non-text origin. */
  threshold?: number;
  /** Press-and-hold duration (ms) before the marquee activates from inside
   * editable text. Lets users lasso from anywhere — same gesture Notion uses
   * on touch / extended-press. Default 320 ms. */
  longPressMs?: number;
  /** Pixels of movement BEFORE the long-press fires that cancels the gesture
   * (so the user can still start a normal text selection). Default 6. */
  longPressMoveCancel?: number;
  skipSelector?: string;
}

/** Generic rubber-band drag-to-select overlay.
 *
 * Two activation paths:
 *   1. Origin is non-text (gutter, page background, between blocks): drag past
 *      `threshold` pixels and the marquee begins.
 *   2. Origin is contentEditable / inside text: hold for `longPressMs` without
 *      moving and the marquee enters with a 0×0 rect at the press point —
 *      hits the block under the pointer immediately so a long-press alone
 *      selects one block. Subsequent drag expands.
 *
 * Always-interactive targets (buttons, inputs, grips, popovers, toolbars) bail
 * unconditionally so the marquee never fights with a real click/drag.
 *
 * The effect runs once per mount; live props are read through `propsRef` so
 * frequent re-renders (selection state changing on every move) don't tear
 * down listeners and wipe the in-flight gesture state.
 */
export function Marquee({
  containerRef, itemSelector, getItemId, onSelect, onDragStart, onDragEnd,
  getBaseline, threshold = 4, longPressMs = 320, longPressMoveCancel = 6,
  skipSelector,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  const propsRef = useRef({
    itemSelector, getItemId, onSelect, onDragStart, onDragEnd, getBaseline,
    threshold, longPressMs, longPressMoveCancel, skipSelector,
  });
  propsRef.current = {
    itemSelector, getItemId, onSelect, onDragStart, onDragEnd, getBaseline,
    threshold, longPressMs, longPressMoveCancel, skipSelector,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = false;
    let armed = false;
    let originIsText = false;
    let longPressTimer: number | null = null;
    let startX = 0;
    let startY = 0;
    let rawClientX = 0;
    let rawClientY = 0;
    let baseSnapshot: string[] = [];
    let additive = false;

    const isAlwaysInteractive = (t: HTMLElement): boolean => {
      // Real interactive HTML tags + Radix item roles. NOTE: do NOT include
      // [role='button'] here — dnd-kit's useSortable spreads role="button"
      // onto BlockShell, so any closest() match would kill the marquee inside
      // every block.
      if (t.closest("button, a, input, textarea, select")) return true;
      if (t.closest("[role='menuitem'], [role='checkbox'], [role='radio'], [role='switch'], [role='separator']")) return true;
      if (t.closest("[data-block-grip]")) return true;
      if (t.closest("[data-block-selection-toolbar]")) return true;
      if (t.closest("[data-row-selection-toolbar]")) return true;
      if (t.closest("[data-radix-popper-content-wrapper]")) return true;
      if (t.closest("[data-radix-portal]")) return true;
      if (t.closest("[data-cell-editing='true']")) return true;
      const skip = propsRef.current.skipSelector;
      if (skip && t.closest(skip)) return true;
      return false;
    };

    const isTextTarget = (t: HTMLElement): boolean => {
      if (t.isContentEditable) return true;
      if (t.closest("[contenteditable='true']")) return true;
      return false;
    };

    const containerOrigin = () => {
      const cr = container.getBoundingClientRect();
      return { left: cr.left, top: cr.top };
    };

    const cancelLongPress = () => {
      if (longPressTimer != null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const fireLongPress = () => {
      longPressTimer = null;
      if (!armed || active) return;
      // Cancel any in-progress native text selection.
      window.getSelection()?.removeAllRanges();
      document.body.style.userSelect = "none";
      document.body.style.cursor = "crosshair";
      active = true;
      propsRef.current.onDragStart?.(additive);
      const mx: Rect = { x: startX, y: startY, w: 0, h: 0 };
      setRect(mx);
      propsRef.current.onSelect(collectHits(mx), additive);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === "touch") return;
      const target = e.target as HTMLElement;
      if (!container.contains(target)) return;
      if (isAlwaysInteractive(target)) return;

      armed = true;
      additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const o = containerOrigin();
      startX = e.clientX - o.left + container.scrollLeft;
      startY = e.clientY - o.top + container.scrollTop;
      rawClientX = e.clientX;
      rawClientY = e.clientY;
      baseSnapshot = additive && propsRef.current.getBaseline
        ? propsRef.current.getBaseline()
        : [];
      originIsText = isTextTarget(target);
      cancelLongPress();
      if (originIsText) {
        longPressTimer = window.setTimeout(fireLongPress, propsRef.current.longPressMs!);
      }
    };

    const beginIfThreshold = (e: PointerEvent): boolean => {
      if (active) return true;
      if (originIsText) return false; // text origin requires long-press
      const o = containerOrigin();
      const curX = e.clientX - o.left + container.scrollLeft;
      const curY = e.clientY - o.top + container.scrollTop;
      const totalDx = Math.abs(curX - startX);
      const totalDy = Math.abs(curY - startY);
      if (totalDx < propsRef.current.threshold! && totalDy < propsRef.current.threshold!) return false;
      active = true;
      document.body.style.userSelect = "none";
      propsRef.current.onDragStart?.(additive);
      return true;
    };

    const collectHits = (mx: Rect): string[] => {
      const items = container.querySelectorAll<HTMLElement>(propsRef.current.itemSelector);
      const o = containerOrigin();
      const hits = new Set(baseSnapshot);
      items.forEach((el) => {
        const id = propsRef.current.getItemId(el);
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

      // Pre-long-press: cancel marquee gesture if user is dragging to text-select.
      if (originIsText && !active) {
        const dx = Math.abs(e.clientX - rawClientX);
        const dy = Math.abs(e.clientY - rawClientY);
        if (dx > propsRef.current.longPressMoveCancel! || dy > propsRef.current.longPressMoveCancel!) {
          armed = false;
          cancelLongPress();
        }
        return;
      }

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
      propsRef.current.onSelect(collectHits(mx), additive);
    };

    const finish = () => {
      const wasActive = active;
      armed = false;
      active = false;
      originIsText = false;
      cancelLongPress();
      setRect(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (wasActive) propsRef.current.onDragEnd?.();
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
      cancelLongPress();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
     
  }, [containerRef]);

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
