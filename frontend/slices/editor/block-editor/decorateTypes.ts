import type { BlockType } from "@/shared/types/domain";

/** Block types whose BlockBody renders a contentEditable we should
 *  decorate (skips code/database/page/columns/toggle which own their
 *  own UI or use mono-font where styling would be wrong). */
export const DECORATE_TYPES = new Set<BlockType>([
  "paragraph", "h1", "h2", "h3", "h4", "h5", "h6", "todo", "bullet", "numbered", "quote", "callout",
]);
