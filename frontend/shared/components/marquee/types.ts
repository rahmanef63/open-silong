import type { RefObject } from "react";

export type Rect = { x: number; y: number; w: number; h: number };

export interface MarqueeProps {
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
   * editable text. Default 320 ms. */
  longPressMs?: number;
  /** Pixels of movement BEFORE the long-press fires that cancels the gesture. */
  longPressMoveCancel?: number;
  skipSelector?: string;
}
