"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Block, ColumnLayout, Page } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const MIN_COL_PCT = 10;

interface Props {
  layout: ColumnLayout;
  columns: Block[][];
  pageId: string;
  page: Page;
  renderBlock: (block: Block, indexInPage: number) => ReactNode;
  onAddBlockInColumn: (col: number) => void;
  onCommitWidths: (next: number[]) => void;
}

/** Renders a layout group as N side-by-side panes. Each pane lists
 *  TOP-LEVEL BlockEditor instances for the blocks bucketed to its
 *  column. Because blocks are real page.blocks rows, every editor
 *  feature (DB view picker, slash menu, drag, comments…) works the
 *  same as outside a column — the prior "DB views can't change inside
 *  a column" bug came from blocks being nested under a parent block. */
export function ColumnLayoutGroup({
  layout, columns, pageId, page, renderBlock, onAddBlockInColumn, onCommitWidths,
}: Props) {
  void pageId; void page;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const widths = normalizeWidths(layout.widths, layout.count);

  // Indexes back into page.blocks so renderBlock can pass the right
  // `index` prop to BlockEditor (used by addBlock(afterIndex)).
  const indexByBlockId = new Map<string, number>();
  page.blocks.forEach((b, i) => indexByBlockId.set(b.id, i));

  return (
    <div ref={containerRef} className="group/cols flex gap-0 w-full my-1">
      {Array.from({ length: layout.count }, (_, i) => (
        <Fragment key={`col-${layout.id}-${i}`}>
          {i > 0 && (
            <ColumnDivider
              leftIdx={i - 1}
              widths={widths}
              getContainer={() => containerRef.current}
              onCommit={onCommitWidths}
            />
          )}
          <ColumnPane
            layoutId={layout.id}
            colIndex={i}
            widthPct={widths[i]}
            blocks={columns[i] ?? []}
            renderBlock={renderBlock}
            onAddBlock={() => onAddBlockInColumn(i)}
            indexByBlockId={indexByBlockId}
          />
        </Fragment>
      ))}
    </div>
  );
}

function normalizeWidths(input: number[] | undefined, count: number): number[] {
  if (input?.length === count) return input;
  return Array.from({ length: count }, () => 100 / count);
}

function ColumnPane({
  layoutId, colIndex, widthPct, blocks, renderBlock, onAddBlock, indexByBlockId,
}: {
  layoutId: string;
  colIndex: number;
  widthPct: number;
  blocks: Block[];
  renderBlock: (block: Block, indexInPage: number) => ReactNode;
  onAddBlock: () => void;
  indexByBlockId: Map<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `layoutcol:${layoutId}:${colIndex}` });

  return (
    <div
      ref={setNodeRef}
      data-col-pane
      style={{ flex: `0 0 ${widthPct}%` }}
      className={cn(
        // Inner panes get 16px gutters so blocks don't butt against
        // the vertical divider line. Outer edges (first / last pane)
        // stay flush so column-zero text aligns with the page content
        // above and below the layout group.
        "min-w-0 px-4 first:pl-0 last:pr-0 group/col rounded transition-colors",
        isOver && "bg-brand/15 ring-2 ring-brand ring-inset",
      )}
    >
      <div data-col-pane-body className="space-y-0.5 min-h-10">
        {blocks.map((b) => {
          const idx = indexByBlockId.get(b.id);
          if (idx == null) return null;
          return <Fragment key={b.id}>{renderBlock(b, idx)}</Fragment>;
        })}
      </div>
      <Button
        variant="ghost"
        onClick={onAddBlock}
        className="mt-1 h-auto gap-1 p-0 text-xs font-normal text-muted-foreground/60 opacity-0 transition hover:bg-transparent hover:text-muted-foreground group-hover/col:opacity-100 [&_svg]:size-3"
      >
        <Plus className="h-3 w-3" /> Add block
      </Button>
    </div>
  );
}

function ColumnDivider({
  leftIdx, getContainer, widths, onCommit,
}: {
  leftIdx: number;
  getContainer: () => HTMLElement | null;
  widths: number[];
  onCommit: (next: number[]) => void;
}) {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const c = getContainer();
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const startX = e.clientX;
    const startLeft = widths[leftIdx];
    const startRight = widths[leftIdx + 1];
    const combined = startLeft + startRight;

    let next = [...widths];
    const onMove = (ev: PointerEvent) => {
      const deltaPct = ((ev.clientX - startX) / rect.width) * 100;
      let l = startLeft + deltaPct;
      let r = startRight - deltaPct;
      l = Math.max(MIN_COL_PCT, Math.min(combined - MIN_COL_PCT, l));
      r = combined - l;
      next[leftIdx] = l;
      next[leftIdx + 1] = r;
      const panes = c.querySelectorAll<HTMLElement>("[data-col-pane]");
      panes.forEach((p, i) => { if (next[i] != null) p.style.flex = `0 0 ${next[i]}%`; });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onCommit(next.map((n) => Math.round(n * 100) / 100));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize columns"
      className="relative w-2 shrink-0 cursor-ew-resize group/divider"
    >
      <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-px bg-transparent rounded-full transition-colors group-hover/cols:bg-border group-hover/divider:!bg-brand group-active/divider:!bg-brand" />
      <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-1 rounded-full bg-brand/40 opacity-0 group-hover/divider:opacity-100 transition-opacity" />
    </div>
  );
}
