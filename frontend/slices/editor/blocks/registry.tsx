import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { BlockType } from "@/shared/types/domain";
import type { BlockRendererProps } from "@/shared/types";
import { Skeleton } from "@/shared/ui/skeleton";
import { ImageBlock } from "./ImageBlock";
import { EmbedBlock } from "./EmbedBlock";
import { ButtonBlock } from "./ButtonBlock";

export type { BlockRendererProps };

// Heavy renderers are dynamic-imported so katex (~280KB) and the
// table editor only land in the bundle when those block types render.
// SSR off because katex/table both need the DOM.
const EquationBlockLazy = dynamic(
  () => import("@/slices/equation").then((m) => ({ default: m.EquationBlock })),
  { ssr: false, loading: () => <span className="text-muted-foreground text-xs">Loading equation…</span> },
);
const SimpleTableBlockLazy = dynamic(
  () => import("@/slices/simple-table").then((m) => ({ default: m.SimpleTableBlock })),
  { ssr: false, loading: () => <Skeleton className="h-24 rounded border border-border bg-muted/40" /> },
);

function EquationAdapter({ block, onUpdate, registerRef }: BlockRendererProps) {
  return (
    <EquationBlockLazy
      text={block.text}
      onText={(text) => onUpdate({ text })}
      registerRef={(el) => registerRef?.(el)}
    />
  );
}

function DividerAdapter() {
  return <hr className="border-border my-2" />;
}

export const BLOCK_RENDERERS: Partial<Record<BlockType, ComponentType<BlockRendererProps>>> = {
  image: ImageBlock,
  embed: EmbedBlock,
  button: ButtonBlock,
  equation: EquationAdapter,
  table: SimpleTableBlockLazy as unknown as ComponentType<BlockRendererProps>,
  divider: DividerAdapter,
};

export function getBlockRenderer(type: BlockType): ComponentType<BlockRendererProps> | undefined {
  return BLOCK_RENDERERS[type];
}
