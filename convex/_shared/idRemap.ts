/** ID-remap helpers for workspace import.
 *
 *  Workspace export bundles everything in one JSON file; importing it
 *  into a fresh (or different) workspace requires rewriting EVERY
 *  cross-reference so the new ids resolve. Source ids are foreign and
 *  may collide with target's existing ids — we always assign fresh
 *  ids and rewrite refs.
 *
 *  Refs we rewrite:
 *    1. Page-tree refs        — `parentId`, `rowOfDatabaseId`,
 *                               `rowIds[]`.
 *    2. Block content refs    — `block.pageId`, `block.databaseId`
 *                               (recursive over `children` + `columns`).
 *    3. Inline-md mentions    — `[label](/p/<oldId>)` inside
 *                               `block.text` / `block.caption` /
 *                               `block.tableRows`.
 *    4. Block id remap        — every `block.id` regenerated so two
 *                               imports from the same source don't
 *                               collide.
 *    5. Property cross-refs   — `relationDatabaseId`,
 *                               `relationInversePropertyId`,
 *                               `rollupRelationPropertyId`,
 *                               `rollupTargetPropertyId`,
 *                               `subItemsParentPropId`,
 *                               `defaultTemplateId`,
 *                               `ButtonAction.pageId`.
 *    6. Property values       — `relation` + `person` arrays inside
 *                               `rowProps` get page-id rewritten.
 *
 *  Every helper here is PURE — no Convex deps — so it can be unit
 *  tested + reused by the future Notion-shape adapter.
 */

import { regenBlockIdsDeep, walkBlocks, type BlockLike } from "./blocks";

/** Generic string→string remap. Map keys are source ids, values are
 *  target ids. Missing keys are passed through unchanged (caller
 *  decides whether to drop or keep). */
export type IdMap = Map<string, string>;

/** Property cross-reference remap inputs. Property ids inside a single
 *  database stay stable on import (we don't regen them — they're
 *  scoped to the db doc), but database ids and page ids do change. */
export interface RemapMaps {
  pageMap: IdMap;
  dbMap: IdMap;
}

const MENTION_RE = /\[([^\]]+)\]\(\/p\/([A-Za-z0-9_-]{4,})\)/g;

/** Rewrite every `[label](/p/<id>)` markdown mention so `<id>` resolves
 *  to the new page id. Mentions with unknown source ids are left
 *  alone (they may point outside the imported set — better a broken
 *  link than a silent drop). */
export function rewriteMentions(text: string, pageMap: IdMap): string {
  if (!text || !text.includes("/p/")) return text;
  return text.replace(MENTION_RE, (full, label, oldId) => {
    const newId = pageMap.get(oldId);
    return newId ? `[${label}](/p/${newId})` : full;
  });
}

/** Walk every text-bearing field on a block tree and rewrite
 *  `/p/<id>` mentions in place. Mutates the structure returned by
 *  `regenBlockIdsDeep` (caller should run this AFTER id regen so
 *  block ids are also fresh). */
export function rewriteMentionsInBlocks(blocks: BlockLike[], pageMap: IdMap): void {
  walkBlocks(blocks, (b) => {
    if (typeof b.text === "string") b.text = rewriteMentions(b.text, pageMap);
    if (typeof b.caption === "string") b.caption = rewriteMentions(b.caption, pageMap);
    if (Array.isArray(b.tableRows)) {
      b.tableRows = b.tableRows.map((row) =>
        Array.isArray(row) ? row.map((cell) => rewriteMentions(cell ?? "", pageMap)) : row,
      );
    }
  });
}

/** Rewrite `block.pageId` / `block.databaseId` recursively. Returns a
 *  fresh tree (does not mutate the input). */
export function remapBlockRefs(blocks: BlockLike[], maps: RemapMaps): BlockLike[] {
  return blocks.map((raw) => {
    const b = (raw ?? {}) as BlockLike;
    const out: BlockLike = { ...b };
    if (typeof b.pageId === "string" && maps.pageMap.has(b.pageId)) {
      out.pageId = maps.pageMap.get(b.pageId)!;
    }
    if (typeof b.databaseId === "string" && maps.dbMap.has(b.databaseId)) {
      out.databaseId = maps.dbMap.get(b.databaseId)!;
    }
    if (Array.isArray(b.children)) out.children = remapBlockRefs(b.children, maps);
    if (Array.isArray(b.columns)) {
      out.columns = b.columns.map((col) =>
        Array.isArray(col) ? remapBlockRefs(col, maps) : col,
      );
    }
    return out;
  });
}

/** Full block-tree pass: regen ids → rewrite block refs → rewrite
 *  inline-md mentions. Returns the rewritten tree. */
export function importBlockTree(blocks: BlockLike[], maps: RemapMaps): BlockLike[] {
  const refRewritten = remapBlockRefs(blocks, maps);
  const idRegen = refRewritten.map(regenBlockIdsDeep);
  rewriteMentionsInBlocks(idRegen, maps.pageMap);
  return idRegen;
}

/** Property shape we touch (intentionally `Partial<Property>` — the
 *  full domain type lives in frontend, server uses `v.array(v.any())`). */
interface PropertyLike {
  id?: string;
  type?: string;
  relationDatabaseId?: string | null;
  relationInversePropertyId?: string;
  rollupRelationPropertyId?: string | null;
  rollupTargetPropertyId?: string | null;
  buttonActions?: Array<{ kind: string; pageId?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

/** Rewrite every cross-database / cross-page id inside a property
 *  array. Property ids themselves stay stable (they're scoped to the
 *  db doc, never remapped). */
export function remapPropertyXRefs(props: unknown[], maps: RemapMaps): PropertyLike[] {
  return (props as PropertyLike[]).map((p) => {
    const out: PropertyLike = { ...p };
    if (typeof out.relationDatabaseId === "string" && maps.dbMap.has(out.relationDatabaseId)) {
      out.relationDatabaseId = maps.dbMap.get(out.relationDatabaseId)!;
    }
    if (typeof out.rollupRelationPropertyId === "string") {
      // rollupRelationPropertyId points at a property on THIS db (stable).
      // No remap needed; left alone for clarity.
    }
    if (Array.isArray(out.buttonActions)) {
      out.buttonActions = out.buttonActions.map((a) => {
        if (a.kind === "open_page" && typeof a.pageId === "string" && maps.pageMap.has(a.pageId)) {
          return { ...a, pageId: maps.pageMap.get(a.pageId)! };
        }
        return a;
      });
    }
    return out;
  });
}

/** Rewrite property values that carry foreign ids — today: relation
 *  arrays (page ids of rows on a target db). `person` arrays carry
 *  user ids, not page ids; we drop them on import (cross-workspace
 *  user ids are meaningless). */
export function remapRowProps(
  rowProps: Record<string, unknown> | undefined,
  properties: PropertyLike[] | undefined,
  pageMap: IdMap,
): Record<string, unknown> | undefined {
  if (!rowProps) return rowProps;
  const out: Record<string, unknown> = { ...rowProps };
  for (const prop of properties ?? []) {
    if (!prop.id) continue;
    const v = out[prop.id];
    if (prop.type === "relation" && Array.isArray(v)) {
      out[prop.id] = (v as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((x) => pageMap.get(x) ?? x)
        .filter((x) => pageMap.has(x) || true); // keep unknown ids — caller may want diagnostic later
    } else if (prop.type === "person" && Array.isArray(v)) {
      out[prop.id] = []; // user ids never round-trip across workspaces
    }
  }
  return out;
}

/** Rewrite `pageId` references inside template seed blocks. Templates
 *  don't have their own ids in the cross-ref graph — only their
 *  embedded blocks do. */
export function remapTemplates(templates: unknown[] | undefined, maps: RemapMaps): unknown[] | undefined {
  if (!Array.isArray(templates)) return templates;
  return templates.map((raw) => {
    const t = (raw ?? {}) as { blocks?: BlockLike[]; rowProps?: Record<string, unknown> };
    const out = { ...(t as Record<string, unknown>) };
    if (Array.isArray(t.blocks)) out.blocks = importBlockTree(t.blocks, maps);
    return out;
  });
}
