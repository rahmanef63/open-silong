import { KeyboardEvent, useRef, useState, useEffect } from "react";
import { Block, BlockType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);
const PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  paragraph: "Write something…",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  todo: "To-do", bullet: "List item", numbered: "List item",
  quote: "Quote", code: "Code…", callout: "Callout…",
};

/** A minimal editable block inside a column — no DnD, no slash menu, no nested blocks */
function InnerBlock({
  block, index, total, colIndex,
  onUpdate, onAdd, onDelete, onFocusNext, onFocusPrev, registerRef,
}: {
  block: Block;
  index: number;
  total: number;
  colIndex: number;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onAdd: (afterIndex: number, type?: BlockType) => void;
  onDelete: (id: string) => void;
  onFocusNext: () => void;
  onFocusPrev: () => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== block.text) el.innerText = block.text;
  }, [block.text, block.type]);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    onUpdate(block.id, { text: (e.currentTarget as HTMLElement).innerText });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const next: BlockType = block.type === "todo" ? "todo" : block.type === "bullet" ? "bullet" : block.type === "numbered" ? "numbered" : "paragraph";
      onAdd(index, next);
      return;
    }
    if (e.key === "Backspace" && el.innerText === "") {
      e.preventDefault();
      if (total > 1) { onDelete(block.id); setTimeout(onFocusPrev, 0); }
      else if (block.type !== "paragraph") onUpdate(block.id, { type: "paragraph" as BlockType });
      return;
    }
    if (e.key === "ArrowDown") onFocusNext();
    if (e.key === "ArrowUp") onFocusPrev();
  };

  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true as any,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": PLACEHOLDERS[block.type] ?? "",
    className: "outline-none min-w-0 w-full whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
  };

  switch (block.type) {
    case "h1": return <h1 ref={setRef as any} {...baseProps} className={baseProps.className + " text-2xl font-bold font-serif py-1"} />;
    case "h2": return <h2 ref={setRef as any} {...baseProps} className={baseProps.className + " text-xl font-semibold font-serif py-0.5"} />;
    case "h3": return <h3 ref={setRef as any} {...baseProps} className={baseProps.className + " text-lg font-semibold py-0.5"} />;
    case "todo":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <Checkbox checked={!!block.checked} onCheckedChange={v => onUpdate(block.id, { checked: !!v })} className="mt-1" />
          <div ref={setRef as any} {...baseProps} className={cn(baseProps.className, block.checked && "line-through text-muted-foreground")} />
        </div>
      );
    case "bullet":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    case "numbered":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums shrink-0">{index + 1}.</span>
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    case "quote":
      return <blockquote ref={setRef as any} {...baseProps} className={baseProps.className + " border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-0.5"} />;
    case "code":
      return <pre ref={setRef as any} {...baseProps} className={baseProps.className + " rounded-md bg-muted/70 border border-border p-3 font-mono text-sm whitespace-pre-wrap"} />;
    case "callout":
      return (
        <div className="flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3">
          <span className="text-lg leading-none">💡</span>
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    case "divider":
      return <hr className="border-border my-2" />;
    default:
      return <p ref={setRef as any} {...baseProps} className={baseProps.className + " leading-7 py-0.5"} />;
  }
}

/** One column pane */
function ColumnPane({
  colIndex, blocks, columnBlockId, pageId,
  onColumnsChange,
}: {
  colIndex: number;
  blocks: Block[];
  columnBlockId: string;
  pageId: string;
  onColumnsChange: (colIndex: number, newBlocks: Block[]) => void;
}) {
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
    <div className="flex-1 min-w-0 px-3 first:pl-0 last:pr-0 border-r border-dashed border-border last:border-r-0 group/col">
      <div className="space-y-0.5 min-h-10">
        {blocks.map((b, i) => (
          <InnerBlock
            key={b.id}
            block={b}
            index={i}
            total={blocks.length}
            colIndex={colIndex}
            onUpdate={onUpdate}
            onAdd={onAdd}
            onDelete={onDelete}
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
