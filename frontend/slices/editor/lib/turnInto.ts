import type { Block, BlockType } from "@/shared/types/domain";
import { uid } from "@/shared/lib/uid";

/** Canonical "turn into <type>" patch builder. Called from every
 *  turn-into entry point — slash menu select, ⋯ menu Turn-into submenu
 *  (top-level + nested), and markdown shortcuts that need extra init
 *  on top of the bare type change.
 *
 *  Always includes `text: ""` because Notion's mental model: turning a
 *  paragraph into a toggle/divider/etc. clears the prior content
 *  rather than inheriting it. `keepText: true` opts out (used by
 *  trivial swaps between text-shape types where preserving prose is
 *  the expected UX: paragraph → quote, bullet → numbered, etc.).
 */
export function buildTurnIntoPatch(
  type: BlockType,
  opts: { keepText?: boolean } = {},
): Partial<Block> {
  const patch: Partial<Block> = { type };
  if (!opts.keepText) patch.text = "";

  if (type === "todo") patch.checked = false;
  if (type === "toggle") {
    patch.children = [];
    patch.collapsed = false;
  }
  if (type === "synced") {
    patch.children = [];
    patch.syncId = uid();
  }
  // columns2..columns5 use the layout-primitive path (runSlashSelect)
  // which inserts sibling blocks; not handled here.

  return patch;
}

/** Set of text-shape block types where turn-into should PRESERVE the
 *  current text content (paragraph ↔ heading ↔ quote ↔ list item, etc.).
 *  Used by callers that want the keepText:true behaviour by default. */
export const TEXT_SHAPE_TYPES: ReadonlySet<BlockType> = new Set<BlockType>([
  "paragraph",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "todo", "bullet", "numbered",
  "quote", "callout",
]);

/** Convenience: build the patch with smart keepText defaulting.
 *  text-shape → text-shape preserves text; everything else clears. */
export function buildSmartTurnIntoPatch(
  fromType: BlockType,
  toType: BlockType,
): Partial<Block> {
  const keepText = TEXT_SHAPE_TYPES.has(fromType) && TEXT_SHAPE_TYPES.has(toType);
  return buildTurnIntoPatch(toType, { keepText });
}
