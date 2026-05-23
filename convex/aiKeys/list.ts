/** Queries for the BYOK AI keys table. Two paths:
 *
 *   - `mine` — user-facing list for Settings → AI. Returns personal
 *     keys for the current user + workspace-scoped keys visible from
 *     their active workspace. Plaintext is NOT returned — only the
 *     `last4` hint + metadata.
 *
 *   - `forResolver` — internal helper called by the action-side
 *     `resolveAiKey` resolver. Returns encrypted envelope + minimal
 *     metadata; called only from server actions, never from clients.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const providerValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("google"),
  v.literal("openrouter"),
  v.literal("custom"),
);

/** Sanitised list for the Settings UI. Drops encrypted blob. */
export const mine = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const personal = await ctx.db
      .query("aiUserKeys")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .filter((q) => q.eq(q.field("scope"), "personal"))
      .take(50);

    const workspace = args.workspaceId
      ? await ctx.db
          .query("aiUserKeys")
          .withIndex("by_workspace_scope", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("scope", "workspace"),
          )
          .take(50)
      : [];

    const sanitise = (row: typeof personal[number]) => ({
      _id: row._id,
      ownerUserId: row.ownerUserId,
      scope: row.scope,
      workspaceId: row.workspaceId ?? null,
      provider: row.provider,
      label: row.label ?? null,
      last4: row.last4,
      endpoint: row.endpoint ?? null,
      enabledModels: row.enabledModels,
      preferOwn: row.preferOwn,
      validatedAt: row.validatedAt ?? null,
      validatedError: row.validatedError ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });

    return [
      ...personal.map(sanitise),
      ...workspace.map(sanitise),
    ];
  },
});

/** Resolver-only — returns encrypted envelope. Called from server
 *  actions via `ctx.runQuery`. Never expose to the client directly. */
export const forResolver = query({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const personal = await ctx.db
      .query("aiUserKeys")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("scope"), "personal"),
          q.eq(q.field("provider"), args.provider),
        ),
      )
      .take(10);

    const workspace = await ctx.db
      .query("aiUserKeys")
      .withIndex("by_workspace_scope", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("scope", "workspace"),
      )
      .filter((q) => q.eq(q.field("provider"), args.provider))
      .take(10);

    return [...personal, ...workspace].map((r) => ({
      _id: r._id,
      ownerUserId: r.ownerUserId,
      scope: r.scope,
      provider: r.provider,
      encryptedKey: r.encryptedKey,
      endpoint: r.endpoint,
      preferOwn: r.preferOwn,
    }));
  },
});
