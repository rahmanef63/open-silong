/** SERVER-side edge extractor + write-time reindex for the memory graph.
 *
 *  Mirrors `frontend/shared/lib/graphLinks.ts:extractEdgesFromBlocks`
 *  exactly — the SAME regex literals + the SAME per-block walk. The rr
 *  import wall forbids the frontend slice from importing this file, so the
 *  logic is duplicated on purpose and pinned by a parity test
 *  (`./links.test.ts`), which asserts both extractors emit identical edges.
 *
 *  `extractEdges` is pure (unit-tested). `reindexPageLinks` is the single
 *  hook every page-write call site invokes (beside `buildSearchText`) to
 *  keep the `pageLinks` edge table + `pages.tags`/`pages.titleKey`
 *  denormalized — delete-by-source then reinsert, mirroring the searchText
 *  denorm.
 */

import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { walkBlocks, type BlockLike } from "./blocks";
import { readPageBlocksById } from "./pageContent";

/** Edge kind — mirror of `frontend/shared/types/graph.ts` `EdgeKind`
 *  (can't import across the frontend↔convex wall). */
export type EdgeKind = "wikilink" | "page-block" | "mention" | "tag";

// ── SSOT regexes (mirrored verbatim in frontend/shared/lib/graphLinks.ts) ─
/** `[[Title]]` / `[[Title|alias]]` — group1 = title, group2 = alias. */
export const WIKILINK_RE = /\[\[([^\]|#^]+?)(?:\|([^\]]+?))?\]\]/g;
/** `#tag`, incl. nested `#a/b` — group1 = tag path. */
export const TAG_RE = /(?:^|\s)#([A-Za-z0-9_][A-Za-z0-9_/-]*)/g;
/** `[label](/p/<id>)` or `[label](/dashboard/p/<id>)` — group2 = pageId. */
export const MENTION_RE = /\[([^\]]+)\]\(\/(?:dashboard\/)?p\/([A-Za-z0-9_-]{4,})\)/g;

/** Bound: max existing edge rows deleted per reindex (delete-by-source). */
const REINDEX_DELETE_CAP = 2000;
/** Bound: how many same-titleKey pages we fetch to decide uniqueness. */
const TITLEKEY_TAKE = 2;

/** Normalize a title into its resolver/ghost key: lowercase, non-alnum runs
 *  → single '-', trimmed. Identical to the client `slug`. */
export function slug(title: string): string {
  return (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Alias of `slug` — the resolver key for `[[Title]]` and `pages.titleKey`. */
export function normalizeTitleKey(title: string): string {
  return slug(title);
}

/** Alias of `slug` for call-site readability at write time. */
export function titleKeyFor(title: string): string {
  return slug(title);
}

/** One raw edge before title resolution. Structurally identical to the
 *  client's `ExtractedEdge` so the parity test can deep-compare. */
export interface RawEdge {
  kind: EdgeKind;
  targetPageId?: string;
  targetTitle?: string;
  tag?: string;
  blockId?: string;
}

function edgeKey(e: RawEdge): string {
  return `${e.kind}|${e.targetPageId ?? ""}|${e.targetTitle ?? ""}|${e.tag ?? ""}|${e.blockId ?? ""}`;
}

function extractFromText(
  text: string,
  blockId: string | undefined,
  push: (e: RawEdge) => void,
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

function extractFromBlock(b: BlockLike, push: (e: RawEdge) => void): void {
  const blockId = typeof b.id === "string" ? b.id : undefined;
  const type = typeof b.type === "string" ? b.type : undefined;
  const pageId = typeof b.pageId === "string" ? b.pageId : undefined;
  if (type === "page" && pageId) {
    push({ kind: "page-block", targetPageId: pageId, blockId });
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

/** Extract all raw edges from a page's block tree. Defensive over the
 *  `v.any()` block shape. De-duplicated per page by
 *  (kind, target, tag, blockId). */
export function extractEdges(blocks: unknown): RawEdge[] {
  const out: RawEdge[] = [];
  if (!Array.isArray(blocks)) return out;
  const seen = new Set<string>();
  const push = (e: RawEdge) => {
    const k = edgeKey(e);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  walkBlocks(blocks as BlockLike[], (b) => extractFromBlock(b, push));
  return out;
}

/** Reindex a single page's outgoing links into `pageLinks`, resolve its
 *  `[[Title]]` wikilinks, and refresh `pages.tags` + `pages.titleKey`.
 *
 *  Call at every page-write site (beside `buildSearchText`). Idempotent:
 *  delete-by-source then reinsert. Legacy pages without a `workspaceId`
 *  are skipped (nothing to stamp) until the multi-workspace backfill
 *  stamps them.
 */
export async function reindexPageLinks(
  ctx: MutationCtx,
  page: Doc<"pages">,
  blocks?: unknown[],
): Promise<void> {
  const workspaceId = page.workspaceId;
  const titleKey = slug(page.title);

  // Keep titleKey fresh even for legacy (un-workspaced) pages so that once
  // they gain a workspaceId their title resolves as a target.
  if (page.titleKey !== titleKey) {
    await ctx.db.patch(page._id, { titleKey });
  }
  if (!workspaceId) return; // legacy row — no workspace to stamp edges into

  // Blocks now live in `pageBlocks`; `page.blocks` is emptied post-migration.
  // Prefer the explicitly-passed array (the write site just built it); fall
  // back to the pageBlocks row so any un-updated caller still indexes content.
  const content = blocks ?? (await readPageBlocksById(ctx, page._id));
  const raw = extractEdges(content);

  // Resolve each wikilink title → unique pageId within the workspace.
  const resolvedRows: Array<{
    kind: EdgeKind;
    targetPageId?: Id<"pages">;
    targetTitle?: string;
    tag?: string;
    blockId?: string;
    resolved: boolean;
  }> = [];

  const tagSet = new Set<string>();
  const titleResolutionCache = new Map<string, Id<"pages"> | null>();

  for (const e of raw) {
    if (e.kind === "tag" && e.tag) {
      tagSet.add(e.tag);
      resolvedRows.push({ kind: "tag", tag: e.tag, blockId: e.blockId, resolved: true });
      continue;
    }
    if (e.kind === "mention" || e.kind === "page-block") {
      // Validate the captured id string is a real `pages` id (format +
      // table) WITHOUT a fetch — normalizeId returns null instead of
      // throwing, so a user-typed junk id never crashes the page save.
      const normalized = e.targetPageId
        ? ctx.db.normalizeId("pages", e.targetPageId)
        : null;
      resolvedRows.push({
        kind: e.kind,
        targetPageId: normalized ?? undefined,
        blockId: e.blockId,
        resolved: normalized !== null,
      });
      continue;
    }
    // wikilink — resolve via by_workspace_titleKey (unique ⇒ resolved).
    const key = slug(e.targetTitle ?? "");
    let resolvedId: Id<"pages"> | null;
    if (titleResolutionCache.has(key)) {
      resolvedId = titleResolutionCache.get(key)!;
    } else {
      const matches = key
        ? await ctx.db
            .query("pages")
            .withIndex("by_workspace_titleKey", (q) =>
              q.eq("workspaceId", workspaceId).eq("titleKey", key),
            )
            .take(TITLEKEY_TAKE)
        : [];
      // Unique, non-self match ⇒ resolved; else ghost.
      const nonSelf = matches.filter((m) => m._id !== page._id);
      resolvedId = nonSelf.length === 1 ? nonSelf[0]._id : null;
      titleResolutionCache.set(key, resolvedId);
    }
    resolvedRows.push({
      kind: "wikilink",
      targetTitle: e.targetTitle,
      targetPageId: resolvedId ?? undefined,
      blockId: e.blockId,
      resolved: resolvedId !== null,
    });
  }

  // Delete existing outgoing edges for this page (bounded).
  const existing = await ctx.db
    .query("pageLinks")
    .withIndex("by_source", (q) => q.eq("sourcePageId", page._id))
    .take(REINDEX_DELETE_CAP);
  for (const row of existing) await ctx.db.delete(row._id);

  // Insert fresh edges, stamping workspaceId.
  const now = Date.now();
  for (const r of resolvedRows) {
    await ctx.db.insert("pageLinks", {
      workspaceId,
      sourcePageId: page._id,
      sourceBlockId: r.blockId ?? "",
      targetPageId: r.targetPageId,
      targetTitle: r.targetTitle,
      tag: r.tag,
      kind: r.kind,
      resolved: r.resolved,
      createdAt: now,
    });
  }

  // Refresh denormalized tags (unique, sorted).
  const tags = Array.from(tagSet).sort();
  const prev = page.tags ?? [];
  const sameTags =
    prev.length === tags.length && prev.every((t, i) => t === tags[i]);
  if (!sameTags) {
    await ctx.db.patch(page._id, { tags });
  }
}
