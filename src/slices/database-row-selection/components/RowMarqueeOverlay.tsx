import type { RefObject } from "react";
import { Marquee } from "@/shared/components/Marquee";
import { useRowSelection } from "./RowSelectionProvider";

interface Props {
  containerRef: RefObject<HTMLElement | null>;
}

/** Drag-to-select rubber-band over a TableView — selects rows whose bounding
 * rect intersects the band. */
export function RowMarqueeOverlay({ containerRef }: Props) {
  const { state, setIds, clear } = useRowSelection();
  return (
    <Marquee
      containerRef={containerRef}
      itemSelector="[data-row-shell-id]"
      getItemId={(el) => el.dataset.rowShellId}
      onSelect={(ids) => setIds(ids)}
      onDragStart={(additive) => { if (!additive) clear(); }}
      getBaseline={() => [...state.ids]}
    />
  );
}
