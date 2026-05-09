/** Block placeholder strings — single source for both top-level
 *  (`BlockBody`) and nested (`NestedBlock`) renderers. Empty string
 *  hides the placeholder (used for non-text blocks like dividers,
 *  embeds, layout containers).
 */

import type { BlockType } from "@/shared/types/domain";

export const TOP_LEVEL_PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Write, or press / for commands",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", h4: "Heading 4",
  todo: "To-do", bullet: "List item", numbered: "List item",
  quote: "Quote", code: "Type code…", callout: "Highlight an idea",
  divider: "", page: "", database: "",
  columns2: "", columns3: "", columns4: "", columns5: "",
  toggle: "", image: "", equation: "", table: "",
  embed: "", button: "",
};

/** Nested context — terser placeholders fit narrower columns / toggles. */
export const NESTED_PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  paragraph: "Write…",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", h4: "Heading 4",
  todo: "To-do", bullet: "List item", numbered: "List item",
  quote: "Quote", callout: "Callout…",
};
