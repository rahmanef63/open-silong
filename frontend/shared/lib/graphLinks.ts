/** CLIENT-side pure edge extractor for the memory graph.
 *
 *  Mirrors `convex/_shared/links.ts:extractEdges` exactly — the SAME regex
 *  literals + the SAME per-block walk — because the rr-portability wall
 *  forbids a frontend slice from importing `convex/`. The two extractors
 *  are kept honest by a parity test (`convex/_shared/links.test.ts`) that
 *  asserts they produce identical edges on a shared fixture.
 *
 *  `ponytail:` the duplicated regexes are the deliberate price of the
 *  frontend↔convex import boundary; the parity test is the guard.
 *
 *  Pure — no React, no store, no convex. Feed it `Block[]` from the store.
 */

import type { Block } from "@/shared/types/domain";
import type { EdgeKind } from "@/shared/types/graph";

// ── SSOT regexes (mirrored verbatim in convex/_shared/links.ts) ──────────
/** `[[Title]]` / `[[Title|alias]]` — group1 = title, group2 = alias. */
export const WIKILINK_RE = /\[\[([^\]|#^]+?)(?:\|([^\]]+?))?\]\]/g;
/** `#tag`, incl. nested `#a/b` — group1 = tag path. */
export const TAG_RE = /(?:^|\s)#([A-Za-z0-9_][A-Za-z0-9_/-]*)/g;
/** `[label](/p/<id>)` or `[label](/dashboard/p/<id>)` — group2 = pageId. */
export const MENTION_RE = /\[([^\]]+)\]\(\/(?:dashboard\/)?p\/([A-Za-z0-9_-]{4,})\)/g;

/** Normalize a title into its resolver/ghost key: lowercase, non-alnum runs
 *  → single '-', trimmed. Must stay identical to the server `slug`. */
export function slug(title: string): string {
  return (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** One raw edge before server-side title resolution. Structurally identical
 *  to the server's `RawEdge` so the parity test can deep-compare. */
export interface ExtractedEdge {
  kind: EdgeKind;
  targetPageId?: string;
  targetTitle?: string;
  tag?: string;
  blockId?: string;
}

function edgeKey(e: ExtractedEdge): string {
  return `${e.kind}|${e.targetPageId ?? ""}|${e.targetTitle ?? ""}|${e.tag ?? ""}|${e.blockId ?? ""}`;
}

function extractFromText(
  text: string,
  blockId: string | undefined,
  push: (e: ExtractedEdge) => void,
): void {
  if (!text) return;
  // matchAll clones the regex — shared module-level /g constants stay clean.
  for (const m of text.matchAll(MENTION_RE)) {
    push({ kind: "mention", targetPageId: m[2], blockId });
  }
  for (const m of text.matchAll(WIKILINK_RE)) {
    const title = (m[1] ?? "").trim();
    if (title) push({ kind: "wikilink", targetTitle: title, blockId });
  }
  for (const m of text.matchAll(TAG_RE)) {
    const tag = m[1];
    if (tag) push({ kind: "tag", tag, blockId });
  }
}

function extractFromBlock(b: Block, push: (e: ExtractedEdge) => void): void {
  const blockId = typeof b.id === "string" ? b.id : undefined;
  if (b.type === "page" && typeof b.pageId === "string") {
    push({ kind: "page-block", targetPageId: b.pageId, blockId });
  }
  if (typeof b.text === "string") extractFromText(b.text, blockId, push);
  if (typeof b.caption === "string") extractFromText(b.caption, blockId, push);
  if (Array.isArray(b.tableRows)) {
    for (const row of b.tableRows) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        if (typeof cell === "string") extractFromText(cell, blockId, push);
      }
    }
  }
}

/** Depth-first pre-order walk over children + columns (mirrors
 *  `useBacklinks`'s walk + the server `walkBlocks`). */
function* walk(blocks: Block[]): Generator<Block> {
  for (const b of blocks) {
    yield b;
    if (b.children) yield* walk(b.children);
    if (b.columns) for (const col of b.columns) yield* walk(col);
  }
}

/** Extract all raw edges from a page's block tree. De-duplicated per page
 *  by (kind, target, tag, blockId) — identical links in the same block
 *  collapse; the same title from two different blocks stays separate. */
export function extractEdgesFromBlocks(blocks: Block[]): ExtractedEdge[] {
  const out: ExtractedEdge[] = [];
  if (!Array.isArray(blocks)) return out;
  const seen = new Set<string>();
  const push = (e: ExtractedEdge) => {
    const k = edgeKey(e);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  for (const b of walk(blocks)) extractFromBlock(b, push);
  return out;
}
