import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "../_shared/auth";
import { logAuditEventInternal } from "../admin/mutations";
import { validateTemplate } from "./lib/validate";
import { instantiateTemplate } from "./lib/instantiate";
import { SEED_TEMPLATES } from "./seed";

export const upsertTemplate = mutation({
  args: {
    id: v.optional(v.id("pageTemplates")),
    name: v.string(),
    icon: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    json: v.any(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, { id, name, icon, category, description, images, json, isPublished }) => {
    const actorId = await requireAdmin(ctx);
    // Validate JSON shape + cross-refs
    validateTemplate(json);
    const safeImages = (images ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 10);
    const now = Date.now();
    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing) throw new Error("Template tidak ditemukan");
      await ctx.db.patch(id, {
        name, icon, category, description, images: safeImages, json, isPublished, updatedAt: now,
      });
      await logAuditEventInternal(ctx, actorId, "template.upsert", String(id), { name });
      return id;
    }
    const newId = await ctx.db.insert("pageTemplates", {
      name, icon, category, description, images: safeImages, json, isPublished,
      isSeed: false,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    });
    await logAuditEventInternal(ctx, actorId, "template.create", String(newId), { name });
    return newId;
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("pageTemplates") },
  handler: async (ctx, { id }) => {
    const actorId = await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return { ok: true };
    if (doc.isSeed) throw new Error("Template seed tidak bisa dihapus — disable lewat unpublish");
    await ctx.db.delete(id);
    await logAuditEventInternal(ctx, actorId, "template.delete", String(id), { name: doc.name });
    return { ok: true };
  },
});

export const instantiate = mutation({
  args: {
    templateId: v.id("pageTemplates"),
    parentPageId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { templateId, parentPageId }) => {
    const userId = await requireAuth(ctx);
    const tpl = await ctx.db.get(templateId);
    if (!tpl) throw new Error("Template tidak ditemukan");
    if (!tpl.isPublished) throw new Error("Template belum dipublish");
    const validated = validateTemplate(tpl.json);
    const result = await instantiateTemplate(ctx, validated, userId, parentPageId ?? null);
    return {
      rootPageId: String(result.rootPageId),
      insertedPages: result.insertedPages,
      insertedDatabases: result.insertedDatabases,
      insertedRows: result.insertedRows,
    };
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const actorId = await requireAdmin(ctx);
    const existing = await ctx.db.query("pageTemplates").collect();
    const seedByName = new Map(
      existing.filter((d) => d.isSeed).map((d) => [d.name, d]),
    );
    let inserted = 0;
    let updated = 0;
    const now = Date.now();
    for (const tpl of SEED_TEMPLATES) {
      validateTemplate(tpl);
      const prior = seedByName.get(tpl.name);
      if (prior) {
        await ctx.db.patch(prior._id, {
          icon: tpl.icon,
          category: tpl.category,
          description: tpl.description,
          // Don't overwrite admin-curated images with empty seed list on re-seed.
          ...(tpl.images && tpl.images.length > 0 ? { images: tpl.images } : {}),
          json: tpl,
          updatedAt: now,
        });
        updated += 1;
      } else {
        await ctx.db.insert("pageTemplates", {
          name: tpl.name,
          icon: tpl.icon,
          category: tpl.category,
          description: tpl.description,
          images: tpl.images,
          json: tpl,
          createdBy: actorId,
          isPublished: true,
          isSeed: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      }
    }
    await logAuditEventInternal(ctx, actorId, "template.seed", undefined, { inserted, updated });
    return { inserted, updated };
  },
});
