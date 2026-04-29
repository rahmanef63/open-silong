import { KeyboardEvent, useEffect, useRef, useState, useCallback } from "react";
import { Block, BlockType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { GripVertical, Plus, Trash2, Copy, Type as TypeIcon, MessageSquare, FileText, Database as DatabaseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashMenu } from "./SlashMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { BLOCK_SPECS } from "./blockSpecs";
import { useBlockHistory } from "@/lib/useBlockHistory";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DatabaseBlock } from "../database/DatabaseBlock";

interface Props {
  pageId: string;
  block: Block;
  index: number;
  total: number;
  onFocusNext: () => void;
  onFocusPrev: () => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}

export function BlockEditor({ pageId, block, index, total, onFocusNext, onFocusPrev, registerRef }: Props) {
  const {
    updateBlock, addBlock, deleteBlock, setBlockType, duplicateBlock,
    createPage, getPage,
  } = useStore();
  const navigate = useNavigate();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const ref = useRef<HTMLElement | null>(null);
  const history = useBlockHistory(block.text);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    history.record(text);
    updateBlock(pageId, block.id, { text });
    if (text === "/" || (text.startsWith("/") && !text.includes("\n"))) {
      setSlashOpen(true);
      setSlashQuery(text.slice(1));
    } else {
      setSlashOpen(false);
    }
  };

  const convertTo = useCallback((type: BlockType) => {
    setBlockType(pageId, block.id, type);
  }, [pageId, block.id, setBlockType]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    const el = e.currentTarget as HTMLElement;

    if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;

    // ----- shortcuts -----
    if (meta && e.altKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
      e.preventDefault();
      convertTo(("h" + e.key) as BlockType);
      return;
    }
    if (meta && e.shiftKey && e.key === "7") { e.preventDefault(); convertTo("todo"); return; }
    if (meta && e.shiftKey && e.key === "8") { e.preventDefault(); convertTo("bullet"); return; }
    if (meta && e.key.toLowerCase() === "d") {
      e.preventDefault();
      const newId = duplicateBlock(pageId, block.id);
      if (newId) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
      return;
    }
    if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const txt = history.redo(el.innerText);
      if (txt !== null) { el.innerText = txt; updateBlock(pageId, block.id, { text: txt }); }
      return;
    }
    if (meta && e.key.toLowerCase() === "y") {
      e.preventDefault();
      const txt = history.redo(el.innerText);
      if (txt !== null) { el.innerText = txt; updateBlock(pageId, block.id, { text: txt }); }
      return;
    }
    if (meta && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const txt = history.undo(el.innerText);
      if (txt !== null) { el.innerText = txt; updateBlock(pageId, block.id, { text: txt }); }
      return;
    }

    // ----- editing flow -----
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const next: BlockType =
        block.type === "todo" ? "todo" :
        block.type === "bullet" || block.type === "numbered" ? block.type :
        "paragraph";
      const newId = addBlock(pageId, index, next);
      setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${newId}"]`)?.focus(), 0);
      return;
    }
    // Shift+Enter: allow native newline (browser inserts <br> in contentEditable)
    if (e.key === "Backspace" && el.innerText === "") {
      e.preventDefault();
      if (total > 1) {
        deleteBlock(pageId, block.id);
        setTimeout(onFocusPrev, 0);
      } else if (block.type !== "paragraph") {
        setBlockType(pageId, block.id, "paragraph");
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // visual indent only — store as data attr for now (true outline indent omitted)
      const cur = parseInt(el.dataset.indent ?? "0", 10);
      const newIndent = e.shiftKey ? Math.max(0, cur - 1) : Math.min(4, cur + 1);
      el.dataset.indent = String(newIndent);
      el.style.marginLeft = `${newIndent * 20}px`;
      return;
    }
    if (e.key === "ArrowDown" && (window.getSelection()?.focusOffset ?? 0) === el.innerText.length) {
      onFocusNext();
    } else if (e.key === "ArrowUp" && (window.getSelection()?.focusOffset ?? 0) === 0) {
      onFocusPrev();
    }
  };

  const onSlashSelect = (type: BlockType) => {
    setSlashOpen(false);
    if (type === "page") {
      const child = createPage(pageId, { title: "New page" });
      updateBlock(pageId, block.id, { type: "page", text: "New page", pageId: child.id });
      return;
    }
    setBlockType(pageId, block.id, type);
    updateBlock(pageId, block.id, { text: "" });
    setTimeout(() => {
      const el2 = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      el2?.focus(); if (el2) el2.innerText = "";
    }, 0);
  };

  // ----- Special block types render their own UI -----
  if (block.type === "page") {
    const target = block.pageId ? getPage(block.pageId) : undefined;
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
        attributes={attributes} listeners={listeners}
        controls={
          <BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />
        }
      >
        <button
          onClick={() => target ? navigate(`/p/${target.id}`) : undefined}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-accent transition"
        >
          <span className="text-base leading-none">{target?.icon ?? "📄"}</span>
          <span className="flex-1 text-sm font-medium underline-offset-2 hover:underline">
            {target?.title || target ? (target?.title || "Untitled") : "Missing page"}
          </span>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </BlockShell>
    );
  }

  if (block.type === "database") {
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
        attributes={attributes} listeners={listeners}
        controls={
          <BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />
        }
      >
        <DatabaseBlock pageId={pageId} block={block} />
      </BlockShell>
    );
  }

  if (block.type === "divider") {
    return (
      <BlockShell
        setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
        attributes={attributes} listeners={listeners}
        controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />}
      >
        <hr className="border-border my-2" />
      </BlockShell>
    );
  }

  return (
    <BlockShell
      setNodeRef={setNodeRef} style={style} isDragging={isDragging} isOver={isOver}
      attributes={attributes} listeners={listeners}
      controls={<BlockControls pageId={pageId} block={block} index={index} listeners={listeners} convertTo={convertTo} />}
    >
      <BlockBody
        block={block}
        setRef={setRef}
        handleInput={handleInput}
        handleKeyDown={handleKeyDown}
        onCheck={(c) => updateBlock(pageId, block.id, { checked: c })}
        onLang={(lang) => updateBlock(pageId, block.id, { lang })}
      />
      {slashOpen && (
        <div className="relative pl-7">
          <SlashMenu query={slashQuery} onSelect={onSlashSelect} onClose={() => setSlashOpen(false)} />
        </div>
      )}
    </BlockShell>
  );
}

function BlockShell({
  children, controls, setNodeRef, style, isDragging, isOver, attributes, listeners,
}: {
  children: React.ReactNode;
  controls: React.ReactNode;
  setNodeRef: (el: HTMLElement | null) => void;
  style: React.CSSProperties;
  isDragging: boolean;
  isOver: boolean;
  attributes: any;
  listeners: any;
}) {
  return (
    <div
      ref={setNodeRef as any}
      style={style}
      {...attributes}
      className={cn(
        "group/block relative",
        isDragging && "opacity-40",
        isOver && "before:absolute before:left-7 before:right-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded"
      )}
    >
      <div className="flex items-start gap-1">
        <div className="flex pt-1.5 opacity-0 group-hover/block:opacity-100 focus-within:opacity-100 transition">
          {controls}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function BlockControls({
  pageId, block, index, listeners, convertTo,
}: {
  pageId: string; block: Block; index: number; listeners: any; convertTo: (t: BlockType) => void;
}) {
  const { addBlock, deleteBlock, duplicateBlock } = useStore();
  return (
    <div className="flex">
      <button
        onClick={() => {
          const id = addBlock(pageId, index);
          setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
        }}
        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        aria-label="Add block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            {...listeners}
            className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
            aria-label="Drag or open block menu"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Block actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => {
            const id = duplicateBlock(pageId, block.id);
            if (id) setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.focus(), 0);
          }}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            <span className="ml-auto text-[10px] text-muted-foreground">⌘D</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("Comments are coming soon", { description: "Per-block comments will live here." })}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" /> Add comment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Turn into</DropdownMenuLabel>
          {BLOCK_SPECS.filter(s => s.type !== "page" && s.type !== "database").slice(0, 8).map(s => (
            <DropdownMenuItem key={s.type} onClick={() => convertTo(s.type)}>
              <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteBlock(pageId, block.id)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
    todo: "To-do", bullet: "List item", numbered: "List item",
    quote: "Quote", code: "Type code…", callout: "Highlight an idea",
    divider: "", page: "", database: "",
  };
  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": placeholders[block.type],
    className: "outline-none flex-1 min-w-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
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
          <Checkbox checked={!!block.checked} onCheckedChange={(v) => onCheck(!!v)} className="mt-1" />
          <div ref={setRef as any} {...baseProps} className={cn(baseProps.className, block.checked && "line-through text-muted-foreground")} />
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
