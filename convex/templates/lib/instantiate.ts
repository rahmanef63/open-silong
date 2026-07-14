import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { uid } from "../../_shared/uid";
import { requireActiveWorkspaceWritable } from "../../_shared/workspace";
import {
  newPageBlockFields,
  insertPageBlocks,
  writePageBlocks,
} from "../../_shared/pageContent";
import type {
  TemplateJson, TplBlockT, TplDatabaseT, TplPageT, TplViewT,
} from "./validate";

/** Recursively build a Nosion block from a template block.
 *  Handles `columns: TplBlock[][]` (for columns2/3) and
 *  `children: TplBlock[]` (for toggle) so AI-generated templates
 *  can express nested column dashboards. */
function buildBlock(
  b: TplBlockT,
  dbMap: Map<string, Id<"databases">>,
  pageMap: Map<string, Id<"pages">>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: uid(),
    type: b.type,
    text: b.text ?? "",
  };
  if (b.checked !== undefined) out.checked = b.checked;
  if (b.lang) out.lang = b.lang;
  if (b.databaseRef) {
    const id = dbMap.get(b.databaseRef);
    if (id) out.databaseId = String(id);
  }
  if (b.pageRef) {
    const id = pageMap.get(b.pageRef);
    if (id) out.pageId = String(id);
  }
  if (Array.isArray(b.columns)) {
    out.columns = b.columns.map((col) =>
      col.map((cb) => buildBlock(cb, dbMap, pageMap)),
    );
  }
  if (Array.isArray(b.children)) {
    out.children = b.children.map((cb) => buildBlock(cb, dbMap, pageMap));
  }
  // payload sprays last so the template can override defaults
  // (e.g. block color, image url, embed url, button label).
  if (b.payload) Object.assign(out, b.payload);
  return out;
}

function buildBlocks(
  blocks: TplBlockT[],
  dbMap: Map<string, Id<"databases">>,
  pageMap: Map<string, Id<"pages">>,
): Record<string, unknown>[] {
  return blocks.map((b) => buildBlock(b, dbMap, pageMap));
}

function collectAllDatabases(page: TplPageT): TplDatabaseT[] {
  const out: TplDatabaseT[] = [];
  function walk(p: TplPageT) {
    for (const db of p.databases ?? []) out.push(db);
    for (const c of p.children ?? []) walk(c);
  }
  walk(page);
  return out;
}

/** Map TplView → DatabaseViewConfig. Spreads `payload` last so AI
 *  templates can customize chart kind, dashboard KPIs, calendar date
 *  property, etc., without the template DSL having to enumerate
 *  every per-view-type option. */
function buildView(v: TplViewT): Record<string, unknown> {
  return {
    id: v.id,
    type: v.type,
    name: v.name,
    groupBy: v.groupBy,
    sorts: [],
    filters: [],
    search: "",
    ...(v.payload ?? {}),
  };
}

function buildDbDoc(
  db: TplDatabaseT,
  userId: Id<"users">,
  dbMap: Map<string, Id<"databases">>,
) {
  const now = Date.now();
  const views = db.views?.length
    ? db.views.map(buildView)
    : [{ id: "v1", type: "table", name: "Table", sorts: [], filters: [], search: "" }];
  const activeViewId = db.views?.find((v) => v.isDefault)?.id ?? views[0].id as string;
  return {
    userId,
    name: db.name,
    icon: db.icon,
    properties: db.properties.map((p) => {
      const out: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        type: p.type,
      };
      if (p.options) out.options = p.options;
      if (p.numberFormat) out.numberFormat = p.numberFormat;
      if (p.numberCurrencyCode) out.numberCurrencyCode = p.numberCurrencyCode;
      if (p.numberDecimals !== undefined) out.numberDecimals = p.numberDecimals;
      if (p.formulaExpression) out.formulaExpression = p.formulaExpression;
      if (p.uniqueIdPrefix) out.uniqueIdPrefix = p.uniqueIdPrefix;
      if (p.relationDatabaseRef) {
        const target = dbMap.get(p.relationDatabaseRef);
        if (target) {
          out.relationDatabaseId = String(target);
          if (p.relationTwoWay) out.relationTwoWay = true;
        }
      }
      return out;
    }),
    rowIds: [] as string[],
    views,
    activeViewId,
    createdAt: now,
    updatedAt: now,
  };
}

export interface InstantiateResult {
  rootPageId: Id<"pages">;
  insertedPages: number;
  insertedDatabases: number;
  insertedRows: number;
}

/** Instantiate a validated TemplateJson into pages + databases owned by userId.
 *  Atomic per Convex mutation (all inserts succeed or mutation throws). */
export async function instantiateTemplate(
  ctx: MutationCtx,
  template: TemplateJson,
  userId: Id<"users">,
  rootParentId: Id<"pages"> | null,
): Promise<InstantiateResult> {
  // Resolve active workspace once; every insert (pages, databases, row
  // pages) MUST stamp `workspaceId` or the workspace-scoped reads will
  // hide the freshly seeded content (databases.list / pages.listMeta
  // both filter through `by_workspace`). Skipping this is what caused
  // template databases to render forever as <DatabaseSkeleton/>.
  const active = await requireActiveWorkspaceWritable(ctx, userId);
  const workspaceId = active._id;

  const dbMap = new Map<string, Id<"databases">>();
  const pageMap = new Map<string, Id<"pages">>();
  let rowsInserted = 0;

  // 1a. Pre-allocate empty databases so cross-refs can resolve in step 1b.
  const allDbs = collectAllDatabases(template.page);
  for (const db of allDbs) {
    const id = await ctx.db.insert("databases", {
      userId,
      workspaceId,
      name: db.name,
      icon: db.icon,
      properties: [],
      rowIds: [],
      views: [{ id: "v_tmp", type: "table", name: "Table", sorts: [], filters: [], search: "" }],
      activeViewId: "v_tmp",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    dbMap.set(db.ref, id);
  }
  // 1b. Patch each db with its real properties (now that dbMap is full,
  //     so relation/rollup refs can resolve).
  for (const db of allDbs) {
    const id = dbMap.get(db.ref)!;
    const doc = buildDbDoc(db, userId, dbMap);
    await ctx.db.patch(id, {
      name: doc.name,
      icon: doc.icon,
      properties: doc.properties,
      views: doc.views,
      activeViewId: doc.activeViewId,
      updatedAt: Date.now(),
    });
  }

  // 2. pre-order walk: insert pages with first-pass blocks (pageRef may not resolve yet)
  let pagesInserted = 0;
  async function walk(p: TplPageT, parentId: Id<"pages"> | null): Promise<Id<"pages">> {
    const now = Date.now();
    const blocks = buildBlocks(p.blocks, dbMap, pageMap);
    const pageId = await ctx.db.insert("pages", {
      userId,
      workspaceId,
      parentId,
      title: p.title,
      icon: p.icon,
      cover: p.cover ?? null,
      ...newPageBlockFields(blocks),
      favorite: false,
      trashed: false,
      isPublic: false,
      // Templates default to full-width — they're built around column
      // dashboards that need the breathing room (cycle 8, 2026-05-09).
      fullWidth: true,
      createdAt: now,
      updatedAt: now,
    });
    await insertPageBlocks(ctx, pageId, blocks);
    pagesInserted += 1;
    if (p.ref) pageMap.set(p.ref, pageId);
    for (const child of p.children ?? []) {
      await walk(child, pageId);
    }
    return pageId;
  }
  const rootPageId = await walk(template.page, rootParentId);

  // 3. second-pass: re-rewrite any page with forward pageRefs (now that pageMap is full)
  function hasUnresolvedPageRef(blocks: TplBlockT[]): boolean {
    for (const b of blocks) {
      if (b.type === "page" && b.pageRef) return true;
      if (b.columns) for (const col of b.columns) if (hasUnresolvedPageRef(col)) return true;
      if (b.children && hasUnresolvedPageRef(b.children)) return true;
    }
    return false;
  }
  async function walkRepatch(p: TplPageT, pageId: Id<"pages">) {
    if (hasUnresolvedPageRef(p.blocks)) {
      const finalBlocks = buildBlocks(p.blocks, dbMap, pageMap);
      await writePageBlocks(ctx, pageId, finalBlocks);
    }
  }
  await walkRepatch(template.page, rootPageId);
  for (const [ref, pid] of pageMap.entries()) {
    if (ref === template.page.ref) continue;
    const tp = findByRef(template.page, ref);
    if (tp) await walkRepatch(tp, pid);
  }

  // 4. seed rows: each row = page with rowOfDatabaseId + rowProps
  for (const db of allDbs) {
    if (!db.seedRows?.length) continue;
    const dbId = dbMap.get(db.ref)!;
    const rowPageIds: Id<"pages">[] = [];
    for (const row of db.seedRows) {
      const titleProp = db.properties.find((p) => p.type === "text") ?? db.properties[0];
      const titleVal = titleProp ? row.props[titleProp.id] : "";
      const seedRowBlocks = [{ id: uid(), type: "paragraph", text: "" }];
      const rowPageId = await ctx.db.insert("pages", {
        userId,
        workspaceId,
        parentId: null,
        title: typeof titleVal === "string" ? titleVal : (titleVal != null ? String(titleVal) : ""),
        icon: "📄",
        cover: null,
        ...newPageBlockFields(seedRowBlocks),
        favorite: false,
        trashed: false,
        isPublic: false,
        rowOfDatabaseId: dbId,
        rowProps: row.props,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await insertPageBlocks(ctx, rowPageId, seedRowBlocks);
      rowPageIds.push(rowPageId);
      rowsInserted += 1;
    }
    await ctx.db.patch(dbId, { rowIds: rowPageIds, updatedAt: Date.now() });
  }

  return {
    rootPageId,
    insertedPages: pagesInserted,
    insertedDatabases: allDbs.length,
    insertedRows: rowsInserted,
  };
}

function findByRef(root: TplPageT, ref: string): TplPageT | null {
  if (root.ref === ref) return root;
  for (const c of root.children ?? []) {
    const f = findByRef(c, ref);
    if (f) return f;
  }
  return null;
}
