import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { validateTemplate } from "./validate";
import { SEED_TEMPLATES } from "../seed";

/** Upsert the default seed catalog into `pageTemplates`. Shared by the
 *  admin panel's `templates.mutations.seedDefaults` and the first-run
 *  wizard's `setup.seedAll` — one implementation, two entry points.
 *  Full-table scan acceptable — admin-only path, `pageTemplates` stays
 *  small (≈20–50 rows per deployment). */
export async function seedTemplateGallery(
  ctx: MutationCtx,
  actorId: Id<"users">,
): Promise<{ inserted: number; updated: number }> {
  const existing = await ctx.db.query("pageTemplates").take(500);
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
  return { inserted, updated };
}
