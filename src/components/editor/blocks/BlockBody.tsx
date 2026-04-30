import type { KeyboardEvent } from "react";
import type { Block, BlockType } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import { CodeBlock } from "@/slices/code-block";

interface Props {
  block: Block;
  setRef: (el: HTMLElement | null) => void;
  handleInput: (e: React.FormEvent<HTMLElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onCheck: (v: boolean) => void;
  onLang: (l: string) => void;
}

const PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Write, or press / for commands",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  todo: "To-do", bullet: "List item", numbered: "List item",
  quote: "Quote", code: "Type code…", callout: "Highlight an idea",
  divider: "", page: "", database: "",
  columns2: "", columns3: "", toggle: "", image: "", equation: "", table: "",
  embed: "", button: "",
};

export function BlockBody({ block, setRef, handleInput, handleKeyDown, onCheck, onLang }: Props) {
  const baseProps = {
    "data-block-id": block.id,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    "data-placeholder": PLACEHOLDERS[block.type] ?? "",
    className:
      "outline-none flex-1 min-w-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
  } as Record<string, unknown>;

  const wrap = (inner: React.ReactNode) => <div className="flex-1 min-w-0">{inner}</div>;

  switch (block.type) {
    case "h1":
      return wrap(<h1 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-3xl font-bold tracking-tight font-serif py-1"} />);
    case "h2":
      return wrap(<h2 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-2xl font-semibold tracking-tight font-serif py-1"} />);
    case "h3":
      return wrap(<h3 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-xl font-semibold tracking-tight py-0.5"} />);
    case "todo":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <Checkbox checked={!!block.checked} onCheckedChange={(v) => onCheck(!!v)} className="mt-1" />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} className={cn(baseProps.className as string, block.checked && "line-through text-muted-foreground")} />
        </div>
      );
    case "bullet":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    case "numbered":
      return (
        <div className="flex flex-1 items-start gap-2 py-1">
          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums">•</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    case "quote":
      return wrap(<blockquote ref={setRef as React.Ref<HTMLQuoteElement>} {...baseProps} className={baseProps.className + " border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-1"} />);
    case "code":
      return (
        <CodeBlock
          text={block.text}
          lang={block.lang}
          registerRef={setRef}
          onText={(next) => handleInput({ currentTarget: { innerText: next } } as React.FormEvent<HTMLElement>)}
          onLang={onLang}
          onKeyDown={handleKeyDown as (e: KeyboardEvent<HTMLElement>) => void}
        />
      );
    case "callout":
      return (
        <div className="flex-1 flex items-start gap-3 rounded-md bg-brand/10 border border-brand/20 p-3">
          <span className="text-lg leading-none">💡</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
    default:
      return wrap(<p ref={setRef as React.Ref<HTMLParagraphElement>} {...baseProps} className={baseProps.className + " leading-7 py-0.5"} />);
  }
}
