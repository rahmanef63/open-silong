import type { Block } from "@/lib/types";

/**
 * Base shape every block-content renderer accepts.
 * Slice-specific block components extend this — DRY contract.
 */
export interface BaseBlockProps {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
}

export interface BlockRendererProps extends BaseBlockProps {
  onReplace?: (next: Block) => void;
  registerRef?: (el: HTMLElement | null) => void;
}
