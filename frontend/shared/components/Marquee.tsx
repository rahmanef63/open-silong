import { createPortal } from "react-dom";
import { useMarqueeDrag } from "./marquee/useMarqueeDrag";
import type { MarqueeProps } from "./marquee/types";

/** Generic rubber-band drag-to-select overlay.
 *
 *  See `./marquee/useMarqueeDrag.ts` for the gesture logic.
 *  Renders a portal-mounted rect inside the container while the user drags. */
export function Marquee(props: MarqueeProps) {
  const rect = useMarqueeDrag(props);

  if (!rect || !props.containerRef.current) return null;
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none absolute z-40 rounded-sm bg-brand/15 ring-1 ring-brand/60"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />,
    props.containerRef.current,
  );
}
