import type { RefObject } from "react";
import { Marquee } from "@/shared/components/Marquee";
import { useBlockSelection } from "./BlockSelectionProvider";

interface Props {
  containerRef: RefObject<HTMLElement | null>;
}

/** Drag-to-select rubber-band over the editor surface — selects top-level
 * blocks whose bounding rect intersects the band. */
export function MarqueeOverlay({ containerRef }: Props) {
  const { state, setIds, clear } = useBlockSelection();
  return (
    <Marquee
      containerRef={containerRef}
      itemSelector="[data-block-shell-id]"
      getItemId={(el) => el.dataset.blockShellId}
      onSelect={(ids) => setIds(ids)}
      onDragStart={(additive) => { if (!additive) clear(); }}
      getBaseline={() => [...state.ids]}
    />
  );
}
