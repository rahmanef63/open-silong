import type { KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import type { Block } from "@/shared/types/domain";
import { Checkbox } from "@/shared/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import { bgColorClass, colorClass } from "../lib/colors";
import { TOP_LEVEL_PLACEHOLDERS as PLACEHOLDERS } from "./placeholders";

// hljs (~90KB) only loaded when a code block actually renders.
const CodeBlock = dynamic(
  () => import("@/slices/code-block").then((m) => ({ default: m.CodeBlock })),
  { ssr: false, loading: () => <div className="h-12 rounded bg-muted animate-pulse" /> },
);

interface Props {
  block: Block;
  setRef: (el: HTMLElement | null) => void;
  handleInput: (e: React.FormEvent<HTMLElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onCheck: (v: boolean) => void;
  onLang: (l: string) => void;
}

export function BlockBody({ block, setRef, handleInput, handleKeyDown, onCheck, onLang }: Props) {
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
      "outline-none flex-1 min-w-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
      textCls,
    ),
  } as Record<string, unknown>;

  const wrap = (inner: React.ReactNode) => <div className="flex-1 min-w-0">{inner}</div>;
  const tinted = (inner: React.ReactNode) =>
    bgCls ? <div className={cn("flex-1 min-w-0 -mx-1 px-1 rounded", bgCls)}>{inner}</div> : <>{inner}</>;

  let body: React.ReactNode;
  switch (block.type) {
    case "h1":
      body = wrap(<h1 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={cn(baseProps.className as string, "text-3xl font-bold tracking-tight font-serif")} />);
      break;
    case "h2":
      body = wrap(<h2 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={cn(baseProps.className as string, "text-2xl font-semibold tracking-tight font-serif")} />);
      break;
    case "h3":
      body = wrap(<h3 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={cn(baseProps.className as string, "text-xl font-semibold tracking-tight")} />);
      break;
    case "todo":
      body = (
        <div className="flex flex-1 items-start gap-2">
          <Checkbox checked={!!block.checked} onCheckedChange={(v) => onCheck(!!v)} className="mt-1" />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} className={cn(baseProps.className as string, block.checked && "line-through text-muted-foreground")} />
        </div>
      );
      break;
    case "bullet":
      body = (
        <div className="flex flex-1 items-start gap-2">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground", textCls && textCls.replace("text-", "bg-"))} />
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
      break;
    case "numbered":
      body = (
        <div className="flex flex-1 items-start gap-2">
          <span className={cn("mt-0.5 text-sm tabular-nums", textCls || "text-muted-foreground")}>•</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
      break;
    case "quote":
      body = wrap(<blockquote ref={setRef as React.Ref<HTMLQuoteElement>} {...baseProps} className={cn(baseProps.className as string, "border-l-4 border-foreground/40 pl-4 italic text-foreground/80")} />);
      break;
    case "code":
      body = (
        <CodeBlock
          text={block.text}
          lang={block.lang}
          registerRef={setRef}
          onText={(next) => handleInput({ currentTarget: { innerText: next } } as React.FormEvent<HTMLElement>)}
          onLang={onLang}
          onKeyDown={handleKeyDown as (e: KeyboardEvent<HTMLElement>) => void}
        />
      );
      break;
    case "callout":
      body = (
        <div className={cn("flex-1 flex items-start gap-3 rounded-md p-3", bgCls || "bg-brand/10 border border-brand/20")}>
          <span className="text-lg leading-none">💡</span>
          <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
        </div>
      );
      // callout already paints its own bg → skip the outer tint
      return body;
    default:
      body = wrap(<p ref={setRef as React.Ref<HTMLParagraphElement>} {...baseProps} className={cn(baseProps.className as string, "leading-7")} />);
  }
  return tinted(body);
}
