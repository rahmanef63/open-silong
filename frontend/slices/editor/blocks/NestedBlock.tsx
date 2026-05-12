import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useNavigate } from "@/shared/lib/router";
import { FileText, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/shared/ui/checkbox";
import { useStore } from "@/shared/lib/store";
import type { Block, BlockType } from "@/shared/types/domain";
import { cn } from "@/shared/lib/utils";

const CodeBlock = dynamic(
  () => import("@/slices/code-block").then((m) => ({ default: m.CodeBlock })),
  { ssr: false, loading: () => <div className="h-12 rounded bg-muted animate-pulse" /> },
);
import { DynamicIcon } from "@/shared/components/icon-picker";
import { MARKDOWN_TRIGGERS } from "../lib/markdownTriggers";
import { SlashMenu } from "../SlashMenu";
import { getBlockRenderer } from "./registry";
import { bgColorClass, colorClass } from "../lib/colors";
import { ColumnBlockEditor } from "../ColumnBlockEditor";
import { ToggleContent } from "./ToggleBlock";
import { DatabaseBlock } from "@/slices/databases/DatabaseBlock";

interface Props {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  onAddAfter: (type?: BlockType) => void;
  onDelete: () => void;
  onFocusNext?: () => void;
  onFocusPrev?: () => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  /** Nesting depth — 1 means direct child of a top-level container. */
  depth?: number;
  /** Owning page id — needed by leaf blocks (e.g. database) that call store
   *  actions scoped to a page. */
  pageId?: string;
}

/** Maximum nesting depth for containers (toggle / columns) inside another container.
 * `depth` here means: this NestedBlock's own depth in the tree. A container at
 * depth > MAX_NEST collapses to a fallback "max nesting reached" pill. */
const MAX_NEST = 5;

function NestingCap({ type }: { type: string }) {
  return (
    <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
      Max nesting reached — {type} can't go deeper than {MAX_NEST} levels.
    </div>
  );
}

import { NESTED_PLACEHOLDERS as PLACEHOLDERS } from "./placeholders";

export function NestedBlock({
  block, onUpdate, onAddAfter, onDelete, onFocusNext, onFocusPrev, registerRef, depth = 1, pageId,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { getPage } = useStore();
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: block.id });
  const sortableStyle = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Don't clobber DOM while user is typing — caret would jump to start.
    if (document.activeElement === el) return;
    if (el.innerText !== block.text) el.innerText = block.text;
  }, [block.text, block.type]);

  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    registerRef?.(block.id, el);
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const text = el.innerText;
    if (block.type === "paragraph") {
      const trigger = MARKDOWN_TRIGGERS[text];
      if (trigger) {
        el.innerText = "";
        onUpdate({ type: trigger.type, text: "", ...(trigger.patch ?? {}) });
        setSlashOpen(false);
        return;
      }
    }
    onUpdate({ text });
    if (text === "/" || (text.startsWith("/") && !text.includes("\n"))) {
      setSlashOpen(true);
      setSlashQuery(text.slice(1));
    } else {
      setSlashOpen(false);
    }
  };

  const onSlashSelect = (type: BlockType) => {
    setSlashOpen(false);
    const patch: Partial<Block> = { type, text: "" };
    if (type === "toggle") { patch.children = []; patch.collapsed = false; }
    if (type === "columns2") {
      const uid = () => Math.random().toString(36).slice(2, 10);
      patch.columns = [
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
      ];
    }
    if (type === "columns3") {
      const uid = () => Math.random().toString(36).slice(2, 10);
      patch.columns = [
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
        [{ id: uid(), type: "paragraph", text: "" }],
      ];
    }
    onUpdate(patch);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      el?.focus();
      if (el) el.innerText = "";
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const next: BlockType =
        block.type === "todo" ? "todo" :
        block.type === "bullet" ? "bullet" :
        block.type === "numbered" ? "numbered" : "paragraph";
      onAddAfter(next);
      return;
    }
    if (e.key === "Backspace" && el.innerText === "") {
      e.preventDefault();
      onDelete();
      onFocusPrev?.();
      return;
    }
    if (e.key === "ArrowDown") onFocusNext?.();
    if (e.key === "ArrowUp") onFocusPrev?.();
  };

  const textCls = colorClass(block.color);
  const bgCls = bgColorClass(block.bgColor);

  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": PLACEHOLDERS[block.type] ?? "",
    className: cn(
      "outline-none flex-1 min-w-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
      textCls,
    ),
  } as Record<string, unknown>;

  const wrap = (inner: React.ReactNode) => <div className="flex-1 min-w-0">{inner}</div>;

  // Leaf blocks (image, embed, button, equation, table, divider) come from registry
  const Renderer = getBlockRenderer(block.type);
  if (Renderer) {
    return (
      <Renderer
        block={block}
        onUpdate={onUpdate}
        registerRef={(el) => setRef(el)}
      />
    );
  }

  const renderContent = () => {
    switch (block.type) {
    case "h1":
      return wrap(<h1 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-2xl font-bold tracking-tight font-serif py-1"} />);
    case "h2":
      return wrap(<h2 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-xl font-semibold tracking-tight font-serif py-0.5"} />);
    case "h3":
      return wrap(<h3 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-lg font-semibold tracking-tight py-0.5"} />);
    case "todo":
      return (
        <div className="flex items-start gap-2 py-1">
          <Checkbox checked={!!block.checked} onCheckedChange={(v) => onUpdate({ checked: !!v })} className="mt-1" />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} className={cn(baseProps.className as string, block.checked && "line-through text-muted-foreground")} />
        </div>
      );
    case "bullet":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    case "numbered":
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums shrink-0">•</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    case "quote":
      return wrap(
        <blockquote
          ref={setRef as React.Ref<HTMLQuoteElement>}
          {...baseProps}
          className={baseProps.className + " border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-0.5"}
        />,
      );
    case "callout":
      return (
        <div className="flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3">
          <span className="text-lg leading-none">💡</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    case "code":
      return (
        <CodeBlock
          text={block.text}
          lang={block.lang}
          registerRef={setRef}
          onText={(next) => onUpdate({ text: next })}
          onLang={(lang) => onUpdate({ lang })}
          onKeyDown={handleKeyDown as (e: KeyboardEvent<HTMLElement>) => void}
        />
      );
    case "paragraph":
      return wrap(
        <p
          ref={setRef as React.Ref<HTMLParagraphElement>}
          {...baseProps}
          className={baseProps.className + " leading-7 py-0.5"}
        />,
      );
    case "page": {
      const target = block.pageId ? getPage(block.pageId) : undefined;
      return (
        <button
          onClick={() => target && navigate(`/p/${target.id}`)}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left hover:bg-accent transition text-sm"
        >
          <DynamicIcon value={target?.icon} className="text-base shrink-0" />
          <span className="flex-1 truncate">{target?.title || "Untitled"}</span>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }
    case "toggle":
      if (depth > MAX_NEST) return wrap(<NestingCap type="Toggle" />);
      return wrap(<ToggleContent block={block} onUpdate={onUpdate} depth={depth + 1} pageId={pageId} />);
    case "columns2":
    case "columns3":
      if (depth > MAX_NEST) return wrap(<NestingCap type="Columns" />);
      return wrap(<ColumnBlockEditor block={block} onUpdate={onUpdate} depth={depth + 1} pageId={pageId} />);
    case "database":
      if (!pageId) return wrap(<NestingCap type="Database (no page)" />);
      return wrap(<DatabaseBlock pageId={pageId} block={block} />);
    default:
      return (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <span className="font-medium capitalize">{block.type}</span> blocks can't be edited inside a container yet — move to top level.
        </div>
      );
    }
  };

  return (
    <div
      ref={setNodeRef as unknown as React.Ref<HTMLDivElement>}
      style={sortableStyle}
      {...attributes}
      className={cn(
        "group/nested relative flex items-start gap-1 min-w-0",
        isDragging && "opacity-40",
        isOver && !isDragging && "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-brand before:rounded",
      )}
    >
      <button
        {...listeners}
        type="button"
        aria-label="Drag block"
        className="mt-1 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 opacity-0 hover:bg-accent group-hover/nested:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className={cn("relative flex-1 min-w-0", bgCls && "-mx-1 px-1 rounded", bgCls)}>
        {renderContent()}
        {slashOpen && (
          <div className="relative">
            <SlashMenu query={slashQuery} onSelect={onSlashSelect} onClose={() => setSlashOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
