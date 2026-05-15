import type { RefObject } from "react";

export type Rect = { x: number; y: number; w: number; h: number };
export type MarqueeMode = "window" | "crossing";

export interface MarqueeProps {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector: string;
  getItemId: (el: HTMLElement) => string | undefined;
  onSelect: (ids: string[], additive: boolean, mode?: MarqueeMode) => void;
  onDragStart?: (additive: boolean) => void;
  onDragEnd?: () => void;
  getBaseline?: () => string[];
  /** Pixels of movement before the marquee activates from a non-text origin. */
  threshold?: number;
  /** Press-and-hold duration (ms) before the marquee activates from inside
   * editable text. Default 320 ms. */
  longPressMs?: number;
  /** Pixels of movement BEFORE the long-press fires that cancels the gesture. */
  longPressMoveCancel?: number;
  skipSelector?: string;
  /** When true, drop ancestor items from selection if any descendant item
   *  is also hit. Used by block-marquee so dragging inside a column picks
   *  the inner blocks instead of the column container. */
  excludeAncestorsWhenDescendantHit?: boolean;
  /** AutoCAD-style direction-driven mode: drag L→R = window (item must
   *  be fully enclosed), drag R→L = crossing (any intersection counts).
   *  When false (default), behaves as crossing only. */
  autocad?: boolean;
}
