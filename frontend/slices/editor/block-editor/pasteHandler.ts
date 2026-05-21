import type { ClipboardEvent } from "react";
import { toast } from "sonner";
import type { Block } from "@/shared/types/domain";
import { markdownToBlocks } from "@/shared/lib/markdown";

interface Deps {
  pageId: string;
  block: Block;
  /** Server-side bulk-insert. Promise so the paste can fire-and-forget
   *  + focus the last inserted block on success. Caller wires either
   *  `adapter.pages.insertBlocksAfter` (production) or any other
   *  adapter impl. */
  insertBlocksAfter: (args: {
    pageId: string;
    anchorBlockId: string;
    blocks: Block[];
    replaceAnchor?: boolean;
  }) => Promise<unknown>;
}

const MAX_PASTE_CHARS = 100_000;

/** Heuristic markdown sniffer. text/plain only.
 *  Strong (any 1): code fence, table separator, divider.
 *  Multi-list: >=2 headings | >=2 list items | >=2 quotes.
 *  Weak combo: >=2 hits across {heading, list, quote, emphasis>=2, link}.
 *  Short single line (<40 chars) → never parse (URLs / words). */
export function detectMarkdown(text: string): boolean {
  if (!text || text.length > MAX_PASTE_CHARS) return false;
  const lines = text.split("\n");
  if (lines.length === 1 && lines[0].length < 40) return false;
  let headings = 0, lists = 0, quotes = 0, dividers = 0;
  let fence = false, tableSep = false, emphasis = 0, links = 0;
  for (const raw of lines) {
    const l = raw.trim();
    if (l.startsWith("```")) fence = true;
    if (/^#{1,6}\s+\S/.test(l)) headings++;
    if (/^[-*+]\s+\S/.test(l) || /^\d+\.\s+\S/.test(l)) lists++;
    if (/^>\s?/.test(l)) quotes++;
    if (l === "---" || l === "***" || l === "___") dividers++;
    if (/\|/.test(l) && /^:?-{3,}:?(\s*\|\s*:?-{3,}:?)+$/.test(l.replace(/^\|/, "").replace(/\|$/, ""))) {
      tableSep = true;
    }
    if (/\*\*[^*\n]+\*\*/.test(l) || /__[^_\n]+__/.test(l)
        || /(?<!\*)\*[^*\s][^*\n]*\*(?!\*)/.test(l)
        || /~~[^~\n]+~~/.test(l) || /`[^`\n]+`/.test(l)) emphasis++;
    if (/\[[^\]\n]+\]\([^)\n]+\)/.test(l)) links++;
  }
  if (fence || tableSep || dividers > 0) return true;
  if (headings >= 2 || lists >= 2 || quotes >= 2) return true;
  const weak = (headings > 0 ? 1 : 0) + (lists > 0 ? 1 : 0) + (quotes > 0 ? 1 : 0)
    + (emphasis >= 2 ? 1 : 0) + (links > 0 ? 1 : 0);
  return weak >= 2;
}

/** Intercept onPaste. Returns true when handled (caller skips
 *  default contentEditable insertion). Uses the server-side
 *  insertBlocksAfter mutation so the splice operates on the
 *  authoritative page.blocks — the frontend store's pageMap is the
 *  slim listMeta projection without blocks, which would silently
 *  wipe the page if used for the splice client-side. */
export function handleMarkdownPaste(e: ClipboardEvent<HTMLElement>, deps: Deps): boolean {
  const { pageId, block, insertBlocksAfter } = deps;

  // Never re-parse markdown inside a code block — code IS the value.
  if (block.type === "code") return false;

  const cd = e.clipboardData;
  if (!cd) return false;
  const plain = cd.getData("text/plain") ?? "";
  if (!plain) return false;

  if (!detectMarkdown(plain)) return false;

  const incoming = markdownToBlocks(plain);
  if (incoming.length === 0) return false;

  // Single-block paste mid-paragraph → inline insertText to keep
  // caret position; don't fire the splice mutation.
  const anchorEl = e.currentTarget as HTMLElement;
  const anchorText = anchorEl?.innerText ?? block.text ?? "";
  const anchorEmpty = anchorText.trim() === "";
  if (incoming.length === 1 && !anchorEmpty) {
    e.preventDefault();
    e.stopPropagation();
    if (document.execCommand) document.execCommand("insertText", false, incoming[0].text);
    return true;
  }

  e.preventDefault();
  e.stopPropagation();

  insertBlocksAfter({
    pageId,
    anchorBlockId: block.id,
    blocks: incoming,
    replaceAnchor: anchorEmpty,
  })
    .then(() => {
      const lastId = incoming[incoming.length - 1]?.id;
      if (lastId) {
        setTimeout(() => {
          document.querySelector<HTMLElement>(`[data-block-id="${lastId}"]`)?.focus();
        }, 0);
      }
      toast.success(`Pasted ${incoming.length} block${incoming.length === 1 ? "" : "s"} from markdown`);
    })
    .catch((err: Error) => {
      console.error("[paste] insertBlocksAfter failed", err);
      toast.error("Paste failed — try again");
    });
  return true;
}
