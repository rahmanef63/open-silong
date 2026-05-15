import { createPortal } from "react-dom";
import { useMarqueeDrag } from "./marquee/useMarqueeDrag";
import type { MarqueeProps } from "./marquee/types";

/** Generic rubber-band drag-to-select overlay.
 *
 *  See `./marquee/useMarqueeDrag.ts` for the gesture logic.
 *  Renders a portal-mounted rect inside the container while the user drags.
 *  AutoCAD-style: window mode (L→R) renders a solid blue ring; crossing
 *  mode (R→L) renders a dashed green ring — a long-standing CAD UX
 *  convention that signals selection semantics at a glance. */
export function Marquee(props: MarqueeProps) {
  const rect = useMarqueeDrag(props);

  if (!rect || !props.containerRef.current) return null;
  const isWindow = rect.mode === "window";
  return createPortal(
    <div
      aria-hidden
      className={
        isWindow
          ? "pointer-events-none absolute z-40 rounded-sm bg-brand/10 ring-1 ring-brand/60"
          : "pointer-events-none absolute z-40 rounded-sm bg-emerald-500/10 ring-1 ring-emerald-500/60 [border-style:dashed] outline-dashed outline-1 outline-emerald-500/70"
      }
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />,
    props.containerRef.current,
  );
}
