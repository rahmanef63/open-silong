import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_shared/auth";
import { logAuditEventInternal } from "./admin/mutations";
import { seedTemplateGallery } from "./templates/lib/seedGallery";
import { validateTemplate } from "./templates/lib/validate";
import { instantiateTemplate } from "./templates/lib/instantiate";
import { notionWorkspace } from "./templates/seed/notionWorkspace";

/** First-run onboarding state for the `/setup` wizard — same contract as
 *  the rest of the template fleet. Public + no PII so the wizard can
 *  render its checklist before sign-in. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    // O(log n) probe via by_role — no scan.
    const superadmin = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first();
    // Any template row ⇒ the gallery seed already ran (seeds are the only
    // writer on a fresh deployment; admin-curated templates come later).
    const template = await ctx.db.query("pageTemplates").first();
    return {
      ownerClaimed: !!superadmin,
      seeded: !!template,
    };
  },
});

/** One-click demo data for cloners — wizard step after claiming
 *  ownership. Seeds the 26-template gallery AND instantiates the
 *  flagship "Notion Workspace" showcase (pages + databases + rows) into
 *  the owner's workspace, on top of the welcome pages that
 *  `ensurePersonalWorkspace` already auto-seeds. Idempotent-ish: when the
 *  gallery was already seeded the showcase instantiation is skipped so a
 *  double-click can't duplicate workspace content. */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const actorId = await requireAdmin(ctx);
    const alreadySeeded = !!(await ctx.db.query("pageTemplates").first());
    const gallery = await seedTemplateGallery(ctx, actorId);
    let showcase: { insertedPages: number; insertedDatabases: number; insertedRows: number } | null = null;
    if (!alreadySeeded) {
      const validated = validateTemplate(notionWorkspace);
      // instantiateTemplate resolves the active workspace and falls back to
      // ensurePersonalWorkspace — safe even before first dashboard visit.
      const result = await instantiateTemplate(ctx, validated, actorId, null);
      showcase = {
        insertedPages: result.insertedPages,
        insertedDatabases: result.insertedDatabases,
        insertedRows: result.insertedRows,
      };
    }
    await logAuditEventInternal(ctx, actorId, "setup.seedAll", undefined, {
      ...gallery,
      showcase: !!showcase,
    });
    return { alreadySeeded, gallery, showcase };
  },
});
