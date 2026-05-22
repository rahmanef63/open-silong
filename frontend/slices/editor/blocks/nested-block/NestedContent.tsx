import { type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { Checkbox } from "@/shared/ui/checkbox";
import { Skeleton } from "@/shared/ui/skeleton";
import { useEditorAdapter } from "@/slices/editor/lib/useEditorAdapter";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Block } from "@/shared/types/domain";
import { getBlockRenderer } from "../registry";
import { ColumnBlockEditor } from "../../ColumnBlockEditor";
import { ToggleContent } from "../ToggleBlock";
import { SyncedBlockContent } from "../SyncedBlock";
import { useEditorComponents } from "../../lib/componentsRegistry";
import { MAX_NEST, NestingCap } from "./NestingCap";

const CodeBlock = dynamic(
  () => import("@/slices/code-block").then((m) => ({ default: m.CodeBlock })),
  { ssr: false, loading: () => <Skeleton className="h-12 rounded" /> },
);

interface Props {
  block: Block;
  baseProps: Record<string, unknown>;
  setRef: (el: HTMLElement | null) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onUpdate: (patch: Partial<Block>) => void;
  depth: number;
  pageId?: string;
  /** 1-based ordinal for numbered blocks, computed by the parent
   *  container. Falls back to 1 if absent. */
  ordinal?: number;
}

const wrap = (inner: React.ReactNode) => <div className="flex-1 min-w-0">{inner}</div>;

export function NestedContent({ block, baseProps, setRef, handleKeyDown, onUpdate, depth, pageId, ordinal }: Props) {
  const navigate = useNavigate();
  const { getPage } = useEditorAdapter();
  const { DatabaseBlock } = useEditorComponents();

  // Leaf blocks (image, embed, button, equation, table, divider) from registry
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

  switch (block.type) {
  case "h1":
    return wrap(<h1 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-2xl font-bold tracking-tight font-serif py-1"} />);
  case "h2":
    return wrap(<h2 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-xl font-semibold tracking-tight font-serif py-0.5"} />);
  case "h3":
    return wrap(<h3 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-lg font-semibold tracking-tight py-0.5"} />);
  case "h4":
    return wrap(<h4 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-base font-semibold tracking-tight py-0.5"} />);
  case "h5":
    return wrap(<h5 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-sm font-semibold tracking-tight uppercase py-0.5"} />);
  case "h6":
    return wrap(<h6 ref={setRef as React.Ref<HTMLHeadingElement>} {...baseProps} className={baseProps.className + " text-xs font-semibold tracking-wide uppercase text-muted-foreground py-0.5"} />);
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
        <span className="mt-0.5 text-sm text-muted-foreground tabular-nums shrink-0 min-w-[1.5em]">{ordinal ?? 1}.</span>
        <div ref={setRef as React.Ref<HTMLDivElement>} {...baseProps} />
      </div>
    );
  case "quote":
    return wrap(
      <blockquote ref={setRef as React.Ref<HTMLQuoteElement>} {...baseProps} className={baseProps.className + " border-l-4 border-foreground/40 pl-4 italic text-foreground/80 py-0.5"} />,
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
    return wrap(<p ref={setRef as React.Ref<HTMLParagraphElement>} {...baseProps} className={baseProps.className + " leading-7 py-0.5"} />);
  case "page": {
    const target = block.pageId ? getPage(block.pageId) : undefined;
    return (
      <Button
        variant="outline"
        onClick={() => target && navigate(`/p/${target.id}`)}
        className="h-auto w-full justify-start gap-2 rounded-md bg-card px-2 py-1.5 text-left text-sm font-normal [&_svg]:size-3.5"
      >
        <DynamicIcon value={target?.icon} className="text-base shrink-0" />
        <span className="flex-1 truncate">{target?.title || "Untitled"}</span>
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    );
  }
  case "toggle":
    if (depth > MAX_NEST) return wrap(<NestingCap type="Toggle" />);
    return wrap(<ToggleContent block={block} onUpdate={onUpdate} depth={depth + 1} pageId={pageId} />);
  case "synced":
    if (depth > MAX_NEST) return wrap(<NestingCap type="Synced" />);
    return wrap(<SyncedBlockContent block={block} onUpdate={onUpdate} pageId={pageId} />);
  case "columns2":
  case "columns3":
  case "columns4":
  case "columns5":
    if (depth > MAX_NEST) return wrap(<NestingCap type="Columns" />);
    return wrap(<ColumnBlockEditor block={block} onUpdate={onUpdate} depth={depth + 1} pageId={pageId} />);
  case "database":
    if (!pageId) return wrap(<NestingCap type="Database (no page)" />);
    if (!DatabaseBlock) return wrap(<NestingCap type="Database (renderer not registered)" />);
    return wrap(<DatabaseBlock pageId={pageId} block={block} />);
  default:
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">
        <span className="font-medium capitalize">{block.type}</span> blocks can&apos;t be edited inside a container yet — move to top level.
      </div>
    );
  }
}
