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
      // Database blocks own their own drag (kanban cards, table rows, etc.).
      // Bailing on pointerdown inside their root prevents accidental
      // block-marquee while reordering kanban cards.
      skipSelector="[data-database-block-root]"
      // Drag inside a column / toggle / synced container: pick the
      // inner blocks, not the parent. The parent shell still gets
      // intersected, but its descendants are also hit so we drop it.
      excludeAncestorsWhenDescendantHit
      // AutoCAD-style: drag rightwards = strict window enclosure;
      // drag leftwards = crossing intersection. Visual: solid blue
      // ring vs dashed green ring.
      autocad
    />
  );
}
