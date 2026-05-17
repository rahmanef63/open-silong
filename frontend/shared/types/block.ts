import type { Block } from "@/shared/types/domain";

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
  /** Set by `BlockEditor` so derived blocks (TOC, mentions, AI) can
   *  query the page's full block list / metadata without prop-drilling. */
  pageId?: string;
}
