import { Fragment, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Block, BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";
import { Plus } from "lucide-react";
import { NestedBlock } from "./blocks/NestedBlock";

const uid = () => Math.random().toString(36).slice(2, 10);
const MIN_COL = 10;

/** One column pane */
function ColumnPane({
  colIndex, blocks, columnBlockId, widthPct, depth, pageId,
  onColumnsChange,
}: {
  colIndex: number;
  blocks: Block[];
  columnBlockId: string;
  widthPct: number;
  depth: number;
  pageId?: string;
  onColumnsChange: (colIndex: number, newBlocks: Block[]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columnBlockId}:${colIndex}` });
  const refs = useRef<Map<string, HTMLElement | null>>(new Map());
  const registerRef = (id: string, el: HTMLElement | null) => refs.current.set(id, el);
  const focusBlock = (idx: number) => {
    const b = blocks[idx];
    if (b) refs.current.get(b.id)?.focus();
  };

  const onUpdate = (id: string, patch: Partial<Block>) => {
    onColumnsChange(colIndex, blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const onAdd = (afterIndex: number, type: BlockType = "paragraph") => {
    const newBlock: Block = { id: uid(), type, text: "", checked: type === "todo" ? false : undefined };
    const next = [...blocks];
    next.splice(afterIndex + 1, 0, newBlock);
    onColumnsChange(colIndex, next);
    setTimeout(() => refs.current.get(newBlock.id)?.focus(), 0);
  };

  const onDelete = (id: string) => {
    const next = blocks.filter(b => b.id !== id);
    onColumnsChange(colIndex, next.length ? next : [{ id: uid(), type: "paragraph", text: "" }]);
  };

  return (
    <div
      ref={setNodeRef}
      data-col-pane
      style={{ flex: `0 0 ${widthPct}%` }}
      className={cn(
        "min-w-0 px-3 first:pl-0 last:pr-0 group/col rounded transition-colors",
        isOver && "bg-brand/15 ring-2 ring-brand ring-inset",
      )}
    >
      <div className="space-y-0.5 min-h-10">
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((b, i) => (
            <NestedBlock
              key={b.id}
              block={b}
              depth={depth}
              pageId={pageId}
              onUpdate={(patch) => onUpdate(b.id, patch)}
              onAddAfter={(type) => onAdd(i, type)}
              onDelete={() => onDelete(b.id)}
              onFocusNext={() => focusBlock(i + 1)}
              onFocusPrev={() => focusBlock(i - 1)}
              registerRef={registerRef}
            />
          ))}
        </SortableContext>
      </div>
      <button
        onClick={() => onAdd(blocks.length - 1)}
        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground opacity-0 group-hover/col:opacity-100 transition"
      >
        <Plus className="h-3 w-3" /> Add block
      </button>
    </div>
  );
}

/** Divider between two panes — drag to redistribute widthPcts[leftIdx] / [leftIdx+1] */
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
      l = Math.max(MIN_COL, Math.min(combined - MIN_COL, l));
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

/** Root column layout block (columns2 / columns3 / columns4 / columns5) — pure callback API.
 * `depth` is the depth assigned to inner NestedBlocks. Top-level usage = 1; nested
 * usage = parent depth + 1. The NestedBlock itself enforces the MAX-NEST cap.
 */
export function ColumnBlockEditor({
  block, onUpdate, depth = 1, pageId,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  depth?: number;
  pageId?: string;
}) {
  const n =
    block.type === "columns5" ? 5 :
    block.type === "columns4" ? 4 :
    block.type === "columns3" ? 3 : 2;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const emptyBlock = (): Block => ({ id: uid(), type: "paragraph", text: "" });

  const columns: Block[][] = block.columns?.length === n
    ? block.columns
    : Array.from({ length: n }, () => [emptyBlock()]);

  const widths: number[] = block.colWidths?.length === n
    ? block.colWidths
    : Array.from({ length: n }, () => 100 / n);

  const handleColumnsChange = (colIndex: number, newBlocks: Block[]) => {
    const next = [...columns];
    next[colIndex] = newBlocks;
    onUpdate({ columns: next });
  };

  const commitWidths = (next: number[]) => onUpdate({ colWidths: next });

  return (
    <div ref={containerRef} className="group/cols flex gap-0 w-full my-1">
      {Array.from({ length: n }, (_, i) => (
        <Fragment key={`pane-frag-${i}`}>
          {i > 0 && (
            <ColumnDivider
              leftIdx={i - 1}
              widths={widths}
              getContainer={() => containerRef.current}
              onCommit={commitWidths}
            />
          )}
          <ColumnPane
            colIndex={i}
            blocks={columns[i] ?? [emptyBlock()]}
            columnBlockId={block.id}
            widthPct={widths[i]}
            depth={depth}
            pageId={pageId}
            onColumnsChange={handleColumnsChange}
          />
        </Fragment>
      ))}
    </div>
  );
}
