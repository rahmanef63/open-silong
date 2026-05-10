import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuth } from "./auth";

const FORBIDDEN = "Tidak berwenang";
const NOT_FOUND = "Tidak ditemukan";

/** Slugify a workspace name into url-safe form. Falls back to "workspace"
 *  if the result would be empty. Caller is responsible for collision
 *  resolution (append `-2`, `-3`, ...). */
export function slugifyWorkspaceName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

/** Append `-2`, `-3`, … until the slug is unused. Reads from `by_slug`. */
async function uniqueSlug(ctx: QueryCtx | MutationCtx, base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const hit = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!hit) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/** Mutation-only. Idempotent. Resolves the user's personal workspace,
 *  creating it (and the owner member row) if missing. Backfills slug /
 *  ownerId / isPersonal on legacy single-workspace rows. */
export async function ensurePersonalWorkspace(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"workspaces">> {
  const owned = await ctx.db
    .query("workspaces")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let personal = owned.find((w) => w.isPersonal === true) ?? owned[0];

  if (!personal) {
    const user = await ctx.db.get(userId);
    const name = (user?.name as string | undefined)?.trim() || "My Workspace";
    const slug = await uniqueSlug(ctx, slugifyWorkspaceName(name));
    const id = await ctx.db.insert("workspaces", {
      userId,
      ownerId: userId,
      name,
      emoji: "🏠",
      slug,
      isPersonal: true,
      createdAt: Date.now(),
    });
    personal = (await ctx.db.get(id))!;
  } else {
    const patch: Record<string, unknown> = {};
    if (!personal.ownerId) patch.ownerId = userId;
    if (personal.isPersonal === undefined) patch.isPersonal = true;
    if (!personal.slug) patch.slug = await uniqueSlug(ctx, slugifyWorkspaceName(personal.name));
    if (personal.createdAt === undefined) patch.createdAt = personal._creationTime;
    if (Object.keys(patch).length) {
      await ctx.db.patch(personal._id, patch);
      personal = (await ctx.db.get(personal._id))!;
    }
  }

  // Owner membership row.
  const memberRow = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", userId).eq("workspaceId", personal._id),
    )
    .unique();
  if (!memberRow) {
    await ctx.db.insert("workspaceMembers", {
      workspaceId: personal._id,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });
  }

  return personal;
}

/** Read-only — returns `null` if user has no workspace yet. Use in
 *  queries; mutations should call `ensurePersonalWorkspace` instead. */
export async function readPersonalWorkspace(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"workspaces"> | null> {
  const owned = await ctx.db
    .query("workspaces")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return owned.find((w) => w.isPersonal === true) ?? owned[0] ?? null;
}

/** Mutation-only. Resolves the active workspace for the current user.
 *  Honors `userProfiles.activeWorkspaceId` when set + still a member;
 *  otherwise falls back to the personal workspace. Auto-creates the
 *  personal workspace if missing. */
export async function getActiveWorkspaceMutation(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"workspaces">> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const wantedId = profile?.activeWorkspaceId;
  if (wantedId) {
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", wantedId),
      )
      .unique();
    if (member) {
      const ws = await ctx.db.get(wantedId);
      if (ws) return ws;
    }
  }
  return await ensurePersonalWorkspace(ctx, userId);
}

/** Query-only — does NOT create. Returns `null` if user has neither
 *  an active selection that's still a member nor any personal workspace
 *  yet (first authed read before any mutation has run). */
export async function readActiveWorkspace(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"workspaces"> | null> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const wantedId = profile?.activeWorkspaceId;
  if (wantedId) {
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", userId).eq("workspaceId", wantedId),
      )
      .unique();
    if (member) {
      const ws = await ctx.db.get(wantedId);
      if (ws) return ws;
    }
  }
  return await readPersonalWorkspace(ctx, userId);
}

/** Throws if the user is not a member of the workspace. Returns the
 *  workspace + member doc (with role). Used by every workspace-scoped
 *  mutation that takes an explicit workspaceId. */
export async function requireWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
): Promise<{ userId: Id<"users">; workspace: Doc<"workspaces">; role: "owner" | "editor" | "viewer" }> {
  const userId = await requireAuth(ctx);
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", userId).eq("workspaceId", workspaceId),
    )
    .unique();
  if (!member) throw new Error(NOT_FOUND);
  const ws = await ctx.db.get(workspaceId);
  if (!ws) throw new Error(NOT_FOUND);
  return { userId, workspace: ws, role: member.role };
}

/** List every workspace the user is a member of, joined with role.
 *  Includes the owner's personal workspace. Sorted by joined date desc. */
export async function listMyWorkspaces(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Array<Doc<"workspaces"> & { role: "owner" | "editor" | "viewer" }>> {
  const memberships = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const docs = await Promise.all(
    memberships.map(async (m) => {
      const ws = await ctx.db.get(m.workspaceId);
      if (!ws) return null;
      return { ...ws, role: m.role };
    }),
  );
  return docs
    .filter((d): d is NonNullable<typeof d> => !!d)
    .sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));
}

/** Predicate for legacy entity rows (pages/databases/etc) that may not
 *  yet have `workspaceId` set. A row is in the active workspace if:
 *    - explicit match, OR
 *    - row has no workspaceId AND active workspace is the user's personal
 *      AND row.userId === current user.
 *  This is the single transitional rule used by every scoped query. */
export function rowInActiveWorkspace(
  row: { workspaceId?: Id<"workspaces"> | undefined; userId: Id<"users"> },
  active: { _id: Id<"workspaces">; isPersonal?: boolean; ownerId?: Id<"users"> | undefined },
  userId: Id<"users">,
): boolean {
  if (row.workspaceId) return row.workspaceId === active._id;
  if (active.isPersonal && row.userId === userId) return true;
  return false;
}

export const ERR_WORKSPACE_FORBIDDEN = FORBIDDEN;
