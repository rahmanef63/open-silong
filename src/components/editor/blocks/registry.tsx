import type { ComponentType } from "react";
import type { BlockType } from "@/lib/types";
import type { BlockRendererProps } from "@/shared/types";
import { EquationBlock } from "@/slices/equation";
import { SimpleTableBlock } from "@/slices/simple-table";
import { ImageBlock } from "./ImageBlock";
import { EmbedBlock } from "./EmbedBlock";
import { ButtonBlock } from "./ButtonBlock";

export type { BlockRendererProps };

function EquationAdapter({ block, onUpdate, registerRef }: BlockRendererProps) {
  return (
    <EquationBlock
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
  table: SimpleTableBlock,
  divider: DividerAdapter,
};

export function getBlockRenderer(type: BlockType): ComponentType<BlockRendererProps> | undefined {
  return BLOCK_RENDERERS[type];
}
