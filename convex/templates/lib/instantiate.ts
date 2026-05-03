import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { TemplateJson, TplBlockT, TplDatabaseT, TplPageT } from "./validate";

const nano = () => Math.random().toString(36).slice(2, 10);

function buildBlocks(
  blocks: TplBlockT[],
  dbMap: Map<string, Id<"databases">>,
  pageMap: Map<string, Id<"pages">>,
): any[] {
  return blocks.map((b) => {
    const out: Record<string, unknown> = {
      id: nano(),
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
    if (b.payload) Object.assign(out, b.payload);
    return out;
  });
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

function buildDbDoc(db: TplDatabaseT, userId: Id<"users">) {
  const now = Date.now();
  const views = db.views?.length
    ? db.views.map((v) => ({
        id: v.id,
        type: v.type,
        name: v.name,
        groupBy: v.groupBy,
        sort: [],
        filters: [],
      }))
    : [{ id: "v1", type: "table", name: "Table", sort: [], filters: [] }];
  const activeViewId = db.views?.find((v) => v.isDefault)?.id ?? views[0].id;
  return {
    userId,
    name: db.name,
    icon: db.icon,
    properties: db.properties.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      ...(p.options ? { options: p.options } : {}),
      ...(p.numberFormat ? { numberFormat: p.numberFormat } : {}),
      ...(p.formulaExpression ? { formulaExpression: p.formulaExpression } : {}),
    })),
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
  rootParentId: string | null,
): Promise<InstantiateResult> {
  const dbMap = new Map<string, Id<"databases">>();
  const pageMap = new Map<string, Id<"pages">>();
  let rowsInserted = 0;

  // 1. insert all databases (rowIds empty for now)
  const allDbs = collectAllDatabases(template.page);
  for (const db of allDbs) {
    const id = await ctx.db.insert("databases", buildDbDoc(db, userId));
    dbMap.set(db.ref, id);
  }

  // 2. pre-order walk: insert pages with first-pass blocks (pageRef may not resolve yet)
  let pagesInserted = 0;
  async function walk(p: TplPageT, parentId: string | null): Promise<Id<"pages">> {
    const now = Date.now();
    const blocks = buildBlocks(p.blocks, dbMap, pageMap);
    const pageId = await ctx.db.insert("pages", {
      userId,
      parentId,
      title: p.title,
      icon: p.icon,
      cover: p.cover ?? null,
      blocks,
      favorite: false,
      trashed: false,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
    pagesInserted += 1;
    if (p.ref) pageMap.set(p.ref, pageId);
    for (const child of p.children ?? []) {
      await walk(child, String(pageId));
    }
    return pageId;
  }
  const rootPageId = await walk(template.page, rootParentId);

  // 3. second-pass: re-rewrite any page with forward pageRefs (now that pageMap is full)
  function hasUnresolvedPageRef(blocks: TplBlockT[]): boolean {
    return blocks.some((b) => b.type === "page" && b.pageRef);
  }
  async function repatch(p: TplPageT, pageId: Id<"pages">) {
    if (hasUnresolvedPageRef(p.blocks)) {
      const finalBlocks = buildBlocks(p.blocks, dbMap, pageMap);
      await ctx.db.patch(pageId, { blocks: finalBlocks, updatedAt: Date.now() });
    }
    for (const child of p.children ?? []) {
      // child page id was assigned only if child had a ref; locate by walking template + map
      // simpler: re-derive by walking template tree alongside child indices
    }
  }
  // Walk in lock-step with insertion order to know each page's id
  async function walkRepatch(p: TplPageT, pageId: Id<"pages">) {
    if (hasUnresolvedPageRef(p.blocks)) {
      const finalBlocks = buildBlocks(p.blocks, dbMap, pageMap);
      await ctx.db.patch(pageId, { blocks: finalBlocks, updatedAt: Date.now() });
    }
  }
  // For root + every refed page, repatch if needed (others can't have forward refs we'd resolve)
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
    const rowPageIds: string[] = [];
    for (const row of db.seedRows) {
      const titleProp = db.properties.find((p) => p.type === "text") ?? db.properties[0];
      const titleVal = titleProp ? row.props[titleProp.id] : "";
      const rowPageId = await ctx.db.insert("pages", {
        userId,
        parentId: null,
        title: typeof titleVal === "string" ? titleVal : (titleVal != null ? String(titleVal) : ""),
        icon: "📄",
        cover: null,
        blocks: [{ id: nano(), type: "paragraph", text: "" }],
        favorite: false,
        trashed: false,
        isPublic: false,
        rowOfDatabaseId: String(dbId),
        rowProps: row.props,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      rowPageIds.push(String(rowPageId));
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
