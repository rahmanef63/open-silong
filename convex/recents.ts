import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getActiveWorkspaceMutation, readActiveWorkspace } from "./_shared/workspace";
import { COUNT_CAPS } from "./_shared/limits";
import type { Id } from "./_generated/dataModel";

const CAP = 20;

/** Recent page ids for the active workspace. Returns `[]` for anonymous
 *  viewers. Each (user, workspace) gets its own row so switching
 *  workspaces flips the recents list cleanly. Legacy single-row state
 *  (no workspaceId) resolves under the personal workspace via the
 *  `findRecentRow` lookup. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const active = await readActiveWorkspace(ctx, userId);
    if (!active) return [];
    const row = await findRecentRow(ctx, userId, active._id, !!active.isPersonal);
    return row?.pageIds ?? [];
  },
});

export const push = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const active = await getActiveWorkspaceMutation(ctx, userId);
    const row = await findRecentRow(ctx, userId, active._id, !!active.isPersonal);
    const pageIds = [args.pageId, ...(row?.pageIds ?? []).filter((id: string) => id !== args.pageId)].slice(0, CAP);
    if (row) {
      await ctx.db.patch(row._id, { pageIds, workspaceId: active._id });
    } else {
      await ctx.db.insert("recents", { userId, workspaceId: active._id, pageIds });
    }
  },
});

/** Resolves the recents row for (userId, workspaceId). For the personal
 *  workspace, also accepts the legacy unscoped row (workspaceId === undefined)
 *  and returns it so users don't lose history when the schema migrated. */
async function findRecentRow(
  ctx: { db: { query: (table: "recents") => any } },
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
  isPersonal: boolean,
) {
  const owned = await ctx.db
    .query("recents")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .take(COUNT_CAPS.recentsScan);
  const explicit = owned.find((r: any) => r.workspaceId === workspaceId);
  if (explicit) return explicit;
  if (isPersonal) return owned.find((r: any) => !r.workspaceId) ?? null;
  return null;
}
