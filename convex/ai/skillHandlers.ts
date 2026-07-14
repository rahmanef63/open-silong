import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/** Default icon stamped on AI-created pages when the model doesn't pick
 *  one. Matches the `pages.create` default. */
const DEFAULT_ICON = "📄";

/** Server-side query skill handlers. Each runs inline inside the chat
 *  action when the LLM emits a tool_call for the matching skill.id.
 *
 *  Result shape is JSON-serialized + capped at 8KB by the caller before
 *  feeding back into the conversation, so handlers can return rich data
 *  without blowing the model's context. Trim fields here to what the
 *  model actually needs to reason about (drop _creationTime, userId,
 *  workspaceId, internal noise). */

export type SkillHandler = (
  ctx: ActionCtx,
  args: Record<string, unknown>,
) => Promise<unknown>;

const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

export const SKILL_HANDLERS: Record<string, SkillHandler> = {
  "pages.list": async (ctx) => {
    const pages = await ctx.runQuery(api.pages.listMeta, {});
    return pages.slice(0, 80).map((p) => ({
      pageId: p._id,
      title: p.title,
      icon: p.icon,
      parentId: p.parentId,
      previewText: p.previewText ?? "",
      blockCount: p.blockCount ?? 0,
      updatedAt: p.updatedAt,
    }));
  },

  "pages.get": async (ctx, args) => {
    const id = asStr(args.pageId);
    if (!id) return { error: "pageId is required" };
    const doc = await ctx.runQuery(api.pages.getById, { id });
    if (!doc) return { error: "Page not found or unauthorized" };
    return {
      pageId: doc._id,
      title: doc.title,
      icon: doc.icon,
      blocks: (doc.blocks ?? []).slice(0, 200).map((raw) => {
        const b = raw as { type: string; text?: string; checked?: boolean };
        return {
          type: b.type,
          text: b.text ?? "",
          ...(b.checked !== undefined ? { checked: b.checked } : {}),
        };
      }),
    };
  },

  "pages.search": async (ctx, args) => {
    const query = asStr(args.query).slice(0, 200);
    if (!query) return { error: "query is required" };
    // Reuse the search slice if available — falls back to client-side
    // title scan when the search index isn't wired for this user.
    try {
      const result = await ctx.runQuery(api.features.search.queries.search, { q: query, limit: 20 });
      return [
        ...result.pages.map((p) => ({ pageId: p.id, title: p.title, kind: "page" as const })),
        ...result.databases.map((d) => ({ dbId: d.id, name: d.name, kind: "database" as const })),
      ];
    } catch {
      const pages = await ctx.runQuery(api.pages.listMeta, {});
      const needle = query.toLowerCase();
      return pages
        .filter((p) => p.title.toLowerCase().includes(needle) || (p.previewText ?? "").toLowerCase().includes(needle))
        .slice(0, 20)
        .map((p) => ({ pageId: p._id, title: p.title, snippet: p.previewText ?? "" }));
    }
  },

  "databases.list": async (ctx) => {
    const dbs = await ctx.runQuery(api.databases.list, {});
    return dbs.slice(0, 50).map((d: { _id: Id<"databases">; name: string; icon: string; rowIds: Id<"pages">[]; properties?: Array<{ name: string; type: string }> }) => ({
      dbId: d._id,
      name: d.name,
      icon: d.icon,
      rowCount: d.rowIds?.length ?? 0,
      properties: (d.properties ?? []).map((p) => ({ name: p.name, type: p.type })),
    }));
  },

  "databases.rows": async (ctx, args) => {
    const dbId = asStr(args.dbId);
    if (!dbId) return { error: "dbId is required" };
    // Pull DB metadata from list (no dedicated getOne query exists).
    const dbs = await ctx.runQuery(api.databases.list, {});
    const db = dbs.find((d: { _id: Id<"databases"> }) => d._id === dbId);
    if (!db) return { error: "Database not found or unauthorized" };
    const propNameById: Record<string, string> = {};
    (db.properties ?? []).forEach((p: { id: string; name: string }) => { propNameById[p.id] = p.name; });
    // Row pages are stored as pages with rowOfDatabaseId = dbId. Fetch
    // each by id from db.rowIds (capped at 50 to bound context cost).
    const rowIds = (db.rowIds ?? []).slice(0, 50);
    const rows = await Promise.all(rowIds.map((rid: Id<"pages">) =>
      ctx.runQuery(api.pages.getById, { id: rid as unknown as string }),
    ));
    return {
      name: db.name,
      rows: rows.filter(Boolean).map((r) => {
        const page = r as { _id: string; title: string; rowProps?: Record<string, unknown> };
        const props: Record<string, unknown> = {};
        for (const [pid, val] of Object.entries(page.rowProps ?? {})) {
          const name = propNameById[pid] ?? pid;
          props[name] = val;
        }
        return { rowId: page._id, title: page.title, ...props };
      }),
    };
  },

  // ─── Write skills ────────────────────────────────────────────
  "pages.append_markdown": async (ctx, args) => {
    const pageId = asStr(args.pageId);
    const markdown = asStr(args.markdown);
    if (!pageId) return { error: "pageId is required" };
    if (!markdown) return { error: "markdown is required" };
    try {
      const inserted = await ctx.runMutation(api.pages.appendMarkdown, {
        pageId: pageId as Id<"pages">,
        markdown,
      });
      return { ok: true, blocksInserted: inserted };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },

  "pages.create": async (ctx, args) => {
    const title = asStr(args.title) || "Untitled";
    const parentIdRaw = asStr(args.parentId);
    const icon = asStr(args.icon) || DEFAULT_ICON;
    try {
      const newId = await ctx.runMutation(api.pages.create, {
        parentId: parentIdRaw ? (parentIdRaw as Id<"pages">) : null,
        title,
        icon,
      });
      return { ok: true, pageId: newId };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },

  "pages.set_title": async (ctx, args) => {
    const pageId = asStr(args.pageId);
    const title = asStr(args.title);
    if (!pageId || !title) return { error: "pageId and title are required" };
    try {
      await ctx.runMutation(api.pages.update, {
        pageId: pageId as Id<"pages">,
        patch: { title },
      });
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },

  "pages.set_icon": async (ctx, args) => {
    const pageId = asStr(args.pageId);
    const icon = asStr(args.icon);
    if (!pageId || !icon) return { error: "pageId and icon are required" };
    try {
      await ctx.runMutation(api.pages.update, {
        pageId: pageId as Id<"pages">,
        patch: { icon },
      });
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },
};
