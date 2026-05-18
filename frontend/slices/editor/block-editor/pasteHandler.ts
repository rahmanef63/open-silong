import type { ClipboardEvent } from "react";
import { toast } from "sonner";
import type { Block, BlockType, Page } from "@/shared/types/domain";
import { markdownToBlocks } from "@/shared/lib/markdown";

interface Deps {
  pageId: string;
  block: Block;
  getPage: (id: string) => Page | undefined;
  updatePage: (id: string, patch: Partial<Page>) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
}

const MAX_PASTE_CHARS = 100_000;

/** Heuristic markdown sniffer. Operates on text/plain only.
 *  Returns true if the clipboard payload looks like markdown the
 *  editor should structure into multiple blocks instead of dropping
 *  into a single paragraph.
 *
 *  Strong signals (any ONE triggers): code fence, table separator,
 *  multi-line content with >=2 headings, >=2 list items, multiple
 *  blockquote lines, divider.
 *
 *  Weak signals (need >=2 of these): single heading, single bullet,
 *  inline emphasis on >=2 lines, link, image syntax.
 */
export function detectMarkdown(text: string): boolean {
  if (!text || text.length > MAX_PASTE_CHARS) return false;
  const lines = text.split("\n");
  if (lines.length === 1 && lines[0].length < 40) {
    // Short single-line paste is almost never worth the parse risk —
    // user is probably grabbing a word/url.
    return false;
  }
  let headings = 0;
  let lists = 0;
  let quotes = 0;
  let dividers = 0;
  let fence = false;
  let tableSep = false;
  let emphasis = 0;
  let links = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("```")) { fence = true; }
    if (/^#{1,6}\s+\S/.test(l)) headings++;
    if (/^[-*+]\s+\S/.test(l) || /^\d+\.\s+\S/.test(l)) lists++;
    if (/^>\s?/.test(l)) quotes++;
    if (l === "---" || l === "***" || l === "___") dividers++;
    if (/\|/.test(l) && /^:?-{3,}:?(\s*\|\s*:?-{3,}:?)+$/.test(l.replace(/^\|/, "").replace(/\|$/, ""))) {
      tableSep = true;
    }
    if (/\*\*[^*\n]+\*\*/.test(l) || /__[^_\n]+__/.test(l) || /(?<!\*)\*[^*\s][^*\n]*\*(?!\*)/.test(l) || /~~[^~\n]+~~/.test(l) || /`[^`\n]+`/.test(l)) {
      emphasis++;
    }
    if (/\[[^\]\n]+\]\([^)\n]+\)/.test(l)) links++;
  }
  // Strong: ANY one triggers.
  if (fence || tableSep || dividers > 0) return true;
  if (headings >= 2 || lists >= 2 || quotes >= 2) return true;
  // Weak combo: need >=2 hints across categories.
  const weakHits = (headings > 0 ? 1 : 0) + (lists > 0 ? 1 : 0) + (quotes > 0 ? 1 : 0)
    + (emphasis >= 2 ? 1 : 0) + (links > 0 ? 1 : 0);
  return weakHits >= 2;
}

/** Splice `incoming` blocks into the page AFTER the anchor block.
 *  Returns the new blocks array. If the anchor block is an empty
 *  paragraph, the first incoming block REPLACES it (so an empty line
 *  isn't left dangling above the paste).
 *
 *  Layout stamps from the anchor (when inside a column) propagate to
 *  every inserted block — paste into a column lands inside the column.
 */
function spliceBlocksAfter(
  pageBlocks: Block[], anchorId: string, incoming: Block[],
  anchorIsEmpty: boolean, layoutStamps: { layoutGroup?: string; layoutCol?: number },
): Block[] {
  const anchorIndex = pageBlocks.findIndex((b) => b.id === anchorId);
  if (anchorIndex < 0) return pageBlocks;
  const stamped = incoming.map((b) => ({
    ...b,
    ...(layoutStamps.layoutGroup ? { layoutGroup: layoutStamps.layoutGroup, layoutCol: layoutStamps.layoutCol } : {}),
  }));
  if (anchorIsEmpty) {
    return [
      ...pageBlocks.slice(0, anchorIndex),
      ...stamped,
      ...pageBlocks.slice(anchorIndex + 1),
    ];
  }
  return [
    ...pageBlocks.slice(0, anchorIndex + 1),
    ...stamped,
    ...pageBlocks.slice(anchorIndex + 1),
  ];
}

/** Intercept onPaste. Returns true when handled (caller should skip
 *  the default contentEditable insertion). */
export function handleMarkdownPaste(e: ClipboardEvent<HTMLElement>, deps: Deps): boolean {
  const { pageId, block, getPage, updatePage } = deps;

  // Never re-parse markdown inside a code block — code IS the value.
  if (block.type === "code") return false;

  const cd = e.clipboardData;
  if (!cd) return false;
  const plain = cd.getData("text/plain") ?? "";
  if (!plain) return false;

  if (!detectMarkdown(plain)) return false;

  e.preventDefault();
  e.stopPropagation();

  const incoming = markdownToBlocks(plain);
  if (incoming.length === 0) return false;

  // Single-block paste targeting a same-typed anchor → merge into the
  // anchor text (so pasting one bold-italic word into an empty
  // paragraph keeps it as the same block, not a sibling).
  const anchorEl = (e.currentTarget as HTMLElement);
  const anchorText = anchorEl?.innerText ?? block.text ?? "";
  const anchorEmpty = anchorText.trim() === "";

  if (incoming.length === 1 && !anchorEmpty) {
    // Mid-paragraph paste: just insert the text inline. Use native
    // insertText so caret position is preserved without rebuilding.
    if (document.execCommand) {
      document.execCommand("insertText", false, incoming[0].text);
      return true;
    }
    return false;
  }

  const page = getPage(pageId);
  if (!page) return false;

  const stamps = { layoutGroup: block.layoutGroup, layoutCol: block.layoutCol };
  const nextBlocks = spliceBlocksAfter(page.blocks, block.id, incoming, anchorEmpty, stamps);
  updatePage(pageId, { blocks: nextBlocks });

  // Focus the LAST inserted block so the caret lands at the end of
  // the paste (matches the default browser paste behavior).
  const lastInsertedId = incoming[incoming.length - 1]?.id;
  if (lastInsertedId) {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-block-id="${lastInsertedId}"]`);
      el?.focus();
    }, 0);
  }

  toast.success(`Pasted ${incoming.length} block${incoming.length === 1 ? "" : "s"} from markdown`);
  return true;
}
