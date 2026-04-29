import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Block, BlockType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashMenu } from "./SlashMenu";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  total: number;
  onFocusNext: () => void;
  onFocusPrev: () => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
  dragHandlers: {
    onDragStart: (idx: number) => void;
    onDragOver: (idx: number) => void;
    onDrop: (idx: number) => void;
    draggingIdx: number | null;
    overIdx: number | null;
  };
}

export function BlockEditor({ pageId, block, index, total, onFocusNext, onFocusPrev, registerRef, dragHandlers }: Props) {
  const { updateBlock, addBlock, deleteBlock, setBlockType } = useStore();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const ref = useRef<HTMLElement | null>(null);

  // sync external changes (type switches) into contentEditable
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== block.text) {
      el.innerText = block.text;
    }
  }, [block.text, block.type]);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const text = (e.currentTarget as HTMLElement).innerText;
    updateBlock(pageId, block.id, { text });
    // Slash menu trigger
    if (text === "/" || text.startsWith("/")) {
      setSlashOpen(true);
      setSlashQuery(text.slice(1));
    } else {
      setSlashOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
      // SlashMenu handles these via its own listener
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newId = addBlock(pageId, index, block.type === "todo" ? "todo" : block.type === "bullet" || block.type === "numbered" ? block.type : "paragraph");
      setTimeout(() => {
        const next = document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`);
        next?.focus();
      }, 0);
    } else if (e.key === "Backspace" && (e.currentTarget as HTMLElement).innerText === "") {
      e.preventDefault();
      if (total > 1) {
        deleteBlock(pageId, block.id);
        setTimeout(onFocusPrev, 0);
      } else if (block.type !== "paragraph") {
        setBlockType(pageId, block.id, "paragraph");
      }
    } else if (e.key === "ArrowDown") {
      onFocusNext();
    } else if (e.key === "ArrowUp") {
      onFocusPrev();
    }
  };

  const onSlashSelect = (type: BlockType) => {
    setBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, { text: "" });
    setSlashOpen(false);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      el?.focus();
      if (el) el.innerText = "";
    }, 0);
  };

  const isDragging = dragHandlers.draggingIdx === index;
  const isOver = dragHandlers.overIdx === index && dragHandlers.draggingIdx !== index;

  if (block.type === "divider") {
    return (
      <div
        className={cn("group/block relative py-3", isOver && "border-t-2 border-brand")}
        draggable
        onDragStart={() => dragHandlers.onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); dragHandlers.onDragOver(index); }}
        onDrop={() => dragHandlers.onDrop(index)}
      >
        <BlockHandle pageId={pageId} blockId={block.id} index={index} />
        <hr className="border-border" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/block relative",
        isDragging && "opacity-40",
        isOver && "before:absolute before:left-0 before:right-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded"
      )}
      onDragOver={(e) => { e.preventDefault(); dragHandlers.onDragOver(index); }}
      onDrop={() => dragHandlers.onDrop(index)}
    >
      <div className="flex items-start gap-1 group/row">
        <div className="flex pt-1.5 opacity-0 group-hover/block:opacity-100 transition">
          <BlockHandle pageId={pageId} blockId={block.id} index={index} onDragStart={() => dragHandlers.onDragStart(index)} />
        </div>

        <BlockBody
          block={block}
          setRef={setRef}
          handleInput={handleInput}
          handleKeyDown={handleKeyDown}
          onCheck={(c) => updateBlock(pageId, block.id, { checked: c })}
          onLang={(lang) => updateBlock(pageId, block.id, { lang })}
        />
      </div>

      {slashOpen && (
        <div className="relative pl-7">
          <SlashMenu query={slashQuery} onSelect={onSlashSelect} onClose={() => setSlashOpen(false)} />
        </div>
      )}
    </div>
  );
}

function BlockHandle({ pageId, blockId, index, onDragStart }: { pageId: string; blockId: string; index: number; onDragStart?: () => void }) {
  const { addBlock, deleteBlock } = useStore();
  return (
    <div className="flex">
      <button
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        onClick={() => {
          const id = addBlock(pageId, index);
          setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        }}
        aria-label="Add block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        draggable
        onDragStart={onDragStart}
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function BlockBody({
  block, setRef, handleInput, handleKeyDown, onCheck, onLang,
}: {
  block: Block;
  setRef: (el: HTMLElement | null) => void;
  handleInput: (e: React.FormEvent<HTMLElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onCheck: (v: boolean) => void;
  onLang: (l: string) => void;
}) {
  const placeholders: Record<BlockType, string> = {
    paragraph: "Write, or press / for commands",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    todo: "To-do",
    bullet: "List item",
    numbered: "List item",
    quote: "Quote",
    code: "Type code…",
    callout: "Highlight an idea",
    divider: "",
  };

  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": placeholders[block.type],
    className: "outline-none flex-1 min-w-0 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
  } as any;

  const wrap = (inner: React.ReactNode) => <div className="flex-1 min-w-0">{inner}</div>;

  switch (block.type) {
    case "h1":
      return wrap(<h1 ref={setRef as any} {...baseProps} className={baseProps.className + " text-3xl font-bold tracking-tight font-serif py-1"} />);
    case "h2":
      return wrap(<h2 ref={setRef as any} {...baseProps} className={baseProps.className + " text-2xl font-semibold tracking-tight font-serif py-1"} />);
    case "h3":
      return wrap(<h3 ref={setRef as any} {...baseProps} className={baseProps.className + " text-xl font-semibold tracking-tight py-0.5"} />);
    case "todo":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <Checkbox
            checked={!!block.checked}
            onCheckedChange={(v) => onCheck(!!v)}
            className="mt-1"
          />
          <div
            ref={setRef as any}
            {...baseProps}
            className={cn(baseProps.className, block.checked && "line-through text-muted-foreground")}
          />
        </div>
      );
    case "bullet":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    case "numbered":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums">•</span>
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    case "quote":
      return wrap(<blockquote ref={setRef as any} {...baseProps} className={baseProps.className + " border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-1"} />);
    case "code":
      return (
        <div className="flex-1 rounded-md bg-muted/70 border border-border p-3 font-mono text-sm">
          <div className="flex items-center justify-between mb-2">
            <input
              value={block.lang || ""}
              onChange={(e) => onLang(e.target.value)}
              placeholder="language"
              className="bg-transparent text-xs text-muted-foreground outline-none w-24"
            />
          </div>
          <pre ref={setRef as any} {...baseProps} className={baseProps.className + " whitespace-pre-wrap"} />
        </div>
      );
    case "callout":
      return (
        <div className="flex-1 flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3">
          <span className="text-lg leading-none">💡</span>
          <div ref={setRef as any} {...baseProps} />
        </div>
      );
    default:
      return wrap(<p ref={setRef as any} {...baseProps} className={baseProps.className + " leading-7 py-0.5"} />);
  }
}
