/**
 * Minimal-mode auth stubs for the database-silong template.
 *
 *  Use when your consumer project has its OWN auth layer that already
 *  gates the whole app at the route level — these stubs are noops that
 *  trust the caller. Single-user mode default: every request is
 *  attributed to a synthetic "self" user.
 *
 *  ⚠️ DO NOT use in production multi-user apps without your own
 *  authz gate above the Convex layer. These stubs do NOT enforce
 *  ownership or workspace membership — they exist so the handlers
 *  compile + run for prototyping / single-user mode.
 *
 *  For multi-user production setups, swap with `_shared/full/auth.ts`
 *  (which requires `@convex-dev/auth` + `users` table + `userProfiles`
 *  table). See CONVEX-BACKEND.md.
 */

import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/** Single-user mode — synthetic user id. Replace via SILONG_USER_ID env
 *  if you want a stable id across restarts. */
const SYNTHETIC_USER_ID = "k0000000000000000000000000" as Id<"users">;

export async function requireAuth(_ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  return SYNTHETIC_USER_ID;
}

export async function ensureUserProfile(_ctx: MutationCtx, userId: Id<"users">) {
  return userId;
}

export async function requireAdmin(_ctx: MutationCtx): Promise<Id<"users">> {
  return SYNTHETIC_USER_ID;
}

export async function requireAdminQuery(_ctx: QueryCtx): Promise<Id<"users">> {
  return SYNTHETIC_USER_ID;
}

export async function requireSuperAdmin(_ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  return SYNTHETIC_USER_ID;
}

export async function actorEmail(_ctx: QueryCtx | MutationCtx, _userId: Id<"users">): Promise<string | undefined> {
  return undefined;
}

type OwnedTable = "pages" | "databases";

export async function requireOwned<T extends OwnedTable>(
  _ctx: QueryCtx | MutationCtx,
  _table: T,
  id: string,
): Promise<{ userId: Id<"users">; doc: { _id: string } }> {
  return { userId: SYNTHETIC_USER_ID, doc: { _id: id } };
}

export async function requireWorkspaceAccess<T extends OwnedTable>(
  _ctx: QueryCtx | MutationCtx,
  _table: T,
  id: string,
  _opts?: { write?: boolean },
): Promise<{ userId: Id<"users">; doc: { _id: string } }> {
  return { userId: SYNTHETIC_USER_ID, doc: { _id: id } };
}

export const ERR_FORBIDDEN = "Forbidden";
