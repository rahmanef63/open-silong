/**
 * Minimal-mode workspace stubs for the database-silong template.
 *
 *  Single-workspace mode — every read/write attributed to the
 *  synthetic user, every row "in" the active workspace (which is null).
 *  No multi-tenancy.
 *
 *  For multi-workspace mode, swap with `_shared/full/workspace.ts`
 *  (which requires `workspaces` + `workspaceMembers` + `userProfiles`
 *  tables — see schema.database-silong.ts).
 */

import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export function slugifyWorkspaceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function ensurePersonalWorkspace(_ctx: MutationCtx, _userId: Id<"users">): Promise<null> {
  return null;
}

export async function readPersonalWorkspace(_ctx: QueryCtx, _userId: Id<"users">): Promise<null> {
  return null;
}

export async function getActiveWorkspaceMutation(_ctx: MutationCtx, _userId: Id<"users">): Promise<null> {
  return null;
}

export async function readActiveWorkspace(_ctx: QueryCtx, _userId: Id<"users">): Promise<null> {
  return null;
}

export async function requireWorkspaceMember(
  _ctx: QueryCtx | MutationCtx,
  _userId: Id<"users">,
  workspaceId: Id<"workspaces"> | null,
): Promise<{ workspaceId: Id<"workspaces"> | null; role: "owner" }> {
  return { workspaceId, role: "owner" };
}

export async function listMyWorkspaces(_ctx: QueryCtx, _userId: Id<"users">): Promise<unknown[]> {
  return [];
}

export function rowInActiveWorkspace<Row extends { userId?: Id<"users">; workspaceId?: Id<"workspaces"> | null }>(
  row: Row,
  _active: { id: Id<"workspaces"> } | null,
  _viewerUserId: Id<"users">,
): boolean {
  // Minimal mode = single user = every row passes.
  void row;
  return true;
}

export async function pagesInActiveWorkspace(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  _active: unknown,
) {
  return await ctx.db.query("pages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
}

export async function databasesInActiveWorkspace(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  _active: unknown,
) {
  return await ctx.db.query("databases").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
}

export async function requireActiveWorkspaceWritable(
  _ctx: MutationCtx,
  _userId: Id<"users">,
): Promise<null> {
  return null;
}

export const ERR_WORKSPACE_FORBIDDEN = "Forbidden";
