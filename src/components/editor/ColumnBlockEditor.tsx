import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Block, BlockType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { Plus } from "lucide-react";
import { NestedBlock } from "./blocks/NestedBlock";

const uid = () => Math.random().toString(36).slice(2, 10);

/** One column pane */
function ColumnPane({
  colIndex, blocks, columnBlockId,
  onColumnsChange,
}: {
  colIndex: number;
  blocks: Block[];
  columnBlockId: string;
  pageId: string;
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
      className={cn(
        "flex-1 min-w-0 px-3 first:pl-0 last:pr-0 border-r border-dashed border-border last:border-r-0 group/col rounded transition-colors",
        isOver && "bg-brand/15 ring-2 ring-brand ring-inset",
      )}
    >
      <div className="space-y-0.5 min-h-10">
        {blocks.map((b, i) => (
          <NestedBlock
            key={b.id}
            block={b}
            onUpdate={(patch) => onUpdate(b.id, patch)}
            onAddAfter={(type) => onAdd(i, type)}
            onDelete={() => onDelete(b.id)}
            onFocusNext={() => focusBlock(i + 1)}
            onFocusPrev={() => focusBlock(i - 1)}
            registerRef={registerRef}
          />
        ))}
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

/** Root column layout block (columns2 or columns3) */
export function ColumnBlockEditor({
  pageId, block,
}: {
  pageId: string;
  block: Block;
}) {
  const { updateBlock } = useStore();
  const n = block.type === "columns3" ? 3 : 2;

  const emptyBlock = (): Block => ({ id: uid(), type: "paragraph", text: "" });

  const columns: Block[][] = block.columns?.length === n
    ? block.columns
    : Array.from({ length: n }, () => [emptyBlock()]);

  const handleColumnsChange = (colIndex: number, newBlocks: Block[]) => {
    const next = [...columns];
    next[colIndex] = newBlocks;
    updateBlock(pageId, block.id, { columns: next });
  };

  return (
    <div className="flex gap-0 w-full rounded-md border border-dashed border-border/50 hover:border-border transition p-2 my-1">
      {Array.from({ length: n }, (_, i) => (
        <ColumnPane
          key={i}
          colIndex={i}
          blocks={columns[i] ?? [emptyBlock()]}
          columnBlockId={block.id}
          pageId={pageId}
          onColumnsChange={handleColumnsChange}
        />
      ))}
    </div>
  );
}
