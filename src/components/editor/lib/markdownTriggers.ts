import type { Block, BlockType } from "@/lib/types";

export const MARKDOWN_TRIGGERS: Record<string, { type: BlockType; patch?: Partial<Block> }> = {
  "# ":   { type: "h1" },
  "## ":  { type: "h2" },
  "### ": { type: "h3" },
  "- ":   { type: "bullet" },
  "* ":   { type: "bullet" },
  "1. ":  { type: "numbered" },
  "[] ":  { type: "todo", patch: { checked: false } },
  "[ ] ": { type: "todo", patch: { checked: false } },
  "> ":   { type: "quote" },
  "``` ": { type: "code" },
  "```":  { type: "code" },
  "$$ ":  { type: "equation" },
  "$$":   { type: "equation" },
  "--- ": { type: "divider" },
  "---":  { type: "divider" },
};
