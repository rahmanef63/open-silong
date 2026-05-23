/** Mutations called by the BYOK key actions. Split out because Convex
 *  actions cannot call `ctx.db.*` directly — they must hop through
 *  a mutation. Authz lives HERE (workspace-admin check for shared
 *  keys; owner-only for edits/deletes). */

import { v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const providerValidator = v.union(
  v.literal("openai"), v.literal("anthropic"), v.literal("google"),
  v.literal("openrouter"), v.literal("custom"),
);

const modelValidator = v.object({
  id: v.string(),
  label: v.string(),
  enabled: v.boolean(),
});

async function assertCanWriteWorkspaceKey(
  ctx: MutationCtx,
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
): Promise<void> {
  // Only workspace owner OR explicit "owner"/"admin" role member can
  // create / edit a workspace-scoped key. Members can USE (resolver
  // does NOT gate read), but only admins manage.
  const ws = await ctx.db.get(workspaceId);
  if (!ws) throw new Error("Workspace not found");
  if (ws.ownerId === userId || ws.userId === userId) return;
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", userId).eq("workspaceId", workspaceId))
    .first();
  if (!member) throw new Error("Not a member of this workspace");
  // workspaceMembers.role union is owner | editor | viewer. Editors
  // can manage shared keys; viewers cannot.
  if (member.role === "viewer") {
    throw new Error("Workspace editor or owner required to manage shared AI keys");
  }
}

export const insertNew = mutation({
  args: {
    ownerUserId: v.id("users"),
    scope: v.union(v.literal("personal"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    provider: providerValidator,
    label: v.optional(v.string()),
    encryptedKey: v.string(),
    last4: v.string(),
    endpoint: v.optional(v.string()),
    enabledModels: v.array(modelValidator),
    preferOwn: v.boolean(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (!me || me !== args.ownerUserId) throw new Error("Auth mismatch");
    if (args.scope === "workspace") {
      if (!args.workspaceId) throw new Error("workspaceId required");
      await assertCanWriteWorkspaceKey(ctx, me, args.workspaceId);
    }
    return await ctx.db.insert("aiUserKeys", {
      ownerUserId: args.ownerUserId,
      scope: args.scope,
      workspaceId: args.workspaceId,
      provider: args.provider,
      label: args.label,
      encryptedKey: args.encryptedKey,
      last4: args.last4,
      endpoint: args.endpoint,
      enabledModels: args.enabledModels,
      preferOwn: args.preferOwn,
      createdAt: args.now,
      updatedAt: args.now,
    });
  },
});

export const upsertExisting = mutation({
  args: {
    id: v.id("aiUserKeys"),
    encryptedKey: v.string(),
    last4: v.string(),
    endpoint: v.optional(v.string()),
    label: v.optional(v.string()),
    enabledModels: v.array(modelValidator),
    preferOwn: v.boolean(),
    scope: v.union(v.literal("personal"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    provider: providerValidator,
    userId: v.id("users"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (!me || me !== args.userId) throw new Error("Auth mismatch");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Key not found");
    if (row.ownerUserId !== me) throw new Error("Not your key");
    if (args.scope === "workspace") {
      if (!args.workspaceId) throw new Error("workspaceId required");
      await assertCanWriteWorkspaceKey(ctx, me, args.workspaceId);
    }
    await ctx.db.patch(args.id, {
      encryptedKey: args.encryptedKey,
      last4: args.last4,
      endpoint: args.endpoint,
      label: args.label,
      enabledModels: args.enabledModels,
      preferOwn: args.preferOwn,
      scope: args.scope,
      workspaceId: args.workspaceId,
      provider: args.provider,
      validatedAt: undefined,
      validatedError: undefined,
      updatedAt: args.now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("aiUserKeys") },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Not signed in");
    const row = await ctx.db.get(args.id);
    if (!row) return;
    if (row.ownerUserId !== me) throw new Error("Not your key");
    await ctx.db.delete(args.id);
  },
});

export const setPreferOwn = mutation({
  args: { id: v.id("aiUserKeys"), preferOwn: v.boolean() },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Not signed in");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Key not found");
    if (row.ownerUserId !== me) throw new Error("Not your key");
    await ctx.db.patch(args.id, { preferOwn: args.preferOwn, updatedAt: Date.now() });
  },
});

/** Called by the validate action after a test call resolves. */
export const recordValidation = mutation({
  args: {
    id: v.id("aiUserKeys"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await ctx.db.patch(args.id, {
      validatedAt: args.ok ? Date.now() : row.validatedAt,
      validatedError: args.ok ? undefined : args.error,
      updatedAt: Date.now(),
    });
  },
});
