import { useId } from "react";
import type { Page, Property } from "@/shared/types/domain";

interface BarItem {
  row: Page;
  startMs: number;
  endMs: number;
}

interface BarStyle { left: number; width: number }

interface Props {
  /** All laid-out bars in render order. */
  items: BarItem[];
  /** Row index by row id — drives vertical positioning. */
  rowIndex: Map<string, number>;
  /** Bar position computer (left/width in px) for any item. */
  getBarStyle: (item: BarItem) => BarStyle;
  /** Self-relation property storing predecessor row ids per row. */
  depProp: Property;
  /** Pixel width of one row in the timeline grid (matches min row height). */
  rowHeight: number;
  /** Pixel offset from grid origin to first bar slot (label column width). */
  labelW: number;
  /** Total width of the bar area in px. */
  width: number;
  /** Total visible height in px. */
  height: number;
}

/** Draws SVG dependency arrows between predecessor and dependent bars.
 *  Each row's value of `depProp` is the predecessor row ids list — the
 *  arrow points FROM the end of the predecessor's bar TO the start of
 *  this row's bar with an elbow.
 *
 *  Skips: missing predecessor, predecessor not in current viewport,
 *  self-loops, dangling references.
 */
export function TimelineDependencies({
  items, rowIndex, getBarStyle, depProp, rowHeight, labelW, width, height,
}: Props) {
  const arrowId = useId();
  const itemById = new Map(items.map((it) => [it.row.id, it]));

  const arrows: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];

  for (const dep of items) {
    const raw = dep.row.rowProps?.[depProp.id];
    const predIds = Array.isArray(raw) ? (raw as string[]) : [];
    if (predIds.length === 0) continue;
    const depBar = getBarStyle(dep);
    const depRow = rowIndex.get(dep.row.id);
    if (depRow === undefined) continue;
    const depX = labelW + depBar.left;
    const depY = depRow * rowHeight + rowHeight / 2;

    for (const pid of predIds) {
      if (pid === dep.row.id) continue;
      const pred = itemById.get(pid);
      if (!pred) continue;
      const predRow = rowIndex.get(pred.row.id);
      if (predRow === undefined) continue;
      const predBar = getBarStyle(pred);
      const predX = labelW + predBar.left + predBar.width;
      const predY = predRow * rowHeight + rowHeight / 2;
      arrows.push({ x1: predX, y1: predY, x2: depX, y2: depY, key: `${pid}->${dep.row.id}` });
    }
  }

  if (arrows.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 Z" className="fill-brand/70" />
        </marker>
      </defs>
      {arrows.map((a) => {
        // Elbow path: pred end → step right → vertical → dep start.
        const midX = a.x2 - 8;
        const path = `M ${a.x1} ${a.y1} L ${midX} ${a.y1} L ${midX} ${a.y2} L ${a.x2} ${a.y2}`;
        return (
          <path
            key={a.key}
            d={path}
            className="stroke-brand/70"
            strokeWidth={1.5}
            fill="none"
            markerEnd={`url(#${arrowId})`}
          />
        );
      })}
    </svg>
  );
}
