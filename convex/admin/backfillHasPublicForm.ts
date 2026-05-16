/** One-shot backfill — stamps `hasPublicForm` on every database row.
 *  Run once after deploying the by_has_public_form index so existing
 *  public-form databases continue resolving via `convex/forms/public.ts`
 *  (otherwise the index lookup returns nothing until the next
 *  FormSettings save touches the views array).
 *
 *  Trigger:
 *    pnpm exec convex run admin/backfillHasPublicForm:run --self-hosted
 *
 *  Safe to re-run — idempotent, only patches rows whose computed flag
 *  differs from the stored value. Full table scan is acceptable here
 *  because the migration runs at most once per deploy. */

import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("databases").collect();
    let patched = 0;
    for (const db of all) {
      const computed = (db.views ?? []).some(
        (v: { formIsPublic?: boolean }) => v.formIsPublic === true,
      );
      if (db.hasPublicForm !== computed) {
        await ctx.db.patch(db._id, { hasPublicForm: computed });
        patched++;
      }
    }
    return { scanned: all.length, patched };
  },
});
