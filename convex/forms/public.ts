/** Public form submission surface — anonymous, slug-addressed.
 *
 *  Each database view of type "form" can be flipped to public via
 *  `view.formIsPublic = true`. The slug defaults to the view id but
 *  can be overridden via `view.formSlug`. Anonymous visitors call
 *  `getFormBySlug` to render the schema and `submitForm` to insert
 *  a row. The submission is owned by the database owner (not by an
 *  anonymous user — we don't manufacture user records).
 *
 *  Rate limit: 60/min, bucketed against the form OWNER (since
 *  Convex doesn't expose source IPs to handlers). Submissions are
 *  capped — no callback, no email, no edit. */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { rateLimit } from "../_shared/rateLimit";
import { RATE_LIMITS, COUNT_CAPS } from "../_shared/limits";
import { uid } from "../_shared/uid";

interface FormViewLite {
  id: string;
  formIsPublic?: boolean;
  formSlug?: string;
  formTitle?: string;
  formDescription?: string;
  formSuccessMessage?: string;
  formShownProps?: string[];
  formRequiredProps?: string[];
}

interface FormPropertyLite {
  id: string;
  name: string;
  type: string;
  options?: { id: string; name: string; color?: string }[];
  // Forwarding everything else as opaque so the form can hint hidden
  // config like dateIncludeTime, numberFormat, etc. without us having
  // to enumerate them.
  [k: string]: unknown;
}

/** Resolves a public-form slug to its owning database + view.
 *  Uses the `by_has_public_form` index — only databases with at least
 *  one publicly-flipped form view are scanned. `databases.update`
 *  keeps `hasPublicForm` in sync whenever `views[]` is patched. */
async function findBySlug(
  ctx: { db: { query: (t: "databases") => any } },
  slug: string,
): Promise<{ db: Record<string, unknown>; view: FormViewLite } | null> {
  // Bounded scan (no bare .collect): only databases with a public form are
  // in this index; cap keeps the anonymous-reachable path O(cap) worst-case.
  const dbs = (await ctx.db
    .query("databases")
    .withIndex("by_has_public_form", (q: any) => q.eq("hasPublicForm", true))
    .take(COUNT_CAPS.databasesPerWorkspaceScan)) as Array<Record<string, unknown> & { views?: FormViewLite[]; trashed?: boolean }>;
  for (const db of dbs) {
    if (db.trashed) continue;
    const view = (db.views ?? []).find((v) => v.formIsPublic && (v.formSlug || v.id) === slug);
    if (view) return { db, view };
  }
  return null;
}

/** Return the schema needed to render the form. Returns `null` when
 *  no public form matches the slug — the route renders 404. */
export const getFormBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const found = await findBySlug(ctx, slug);
    if (!found) return null;
    const db = found.db as { _id: Id<"databases">; name: string; properties?: FormPropertyLite[] };
    const view = found.view;
    const allProps = db.properties ?? [];
    const shownIds = view.formShownProps && view.formShownProps.length > 0
      ? new Set(view.formShownProps)
      : null;
    const properties = allProps.filter((p) => (shownIds ? shownIds.has(p.id) : true));
    return {
      databaseId: db._id,
      databaseName: db.name,
      title: view.formTitle?.trim() || db.name,
      description: view.formDescription?.trim() || "",
      successMessage: view.formSuccessMessage?.trim() || "Submitted!",
      requiredPropIds: view.formRequiredProps ?? [],
      properties,
    };
  },
});

/** Insert a row into the database that owns the public form. The
 *  caller is anonymous — the row's `userId` is set to the DB owner. */
export const submitForm = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    rowProps: v.any(),
  },
  handler: async (ctx, { slug, title, rowProps }) => {
    const found = await findBySlug(ctx, slug);
    if (!found) throw new Error("Form not found");
    const db = found.db as {
      _id: Id<"databases">;
      userId: Id<"users">;
      workspaceId?: Id<"workspaces">;
      properties?: { id: string; type: string; uniqueIdPrefix?: string }[];
      rowIds: Id<"pages">[];
      uniqueIdCounter?: number;
    };
    const view = found.view;
    await rateLimit(ctx, db.userId, RATE_LIMITS.formsPublicSubmit);

    // Server-side validation: title required + every required prop present.
    const cleanTitle = String(title ?? "").trim().slice(0, 200);
    if (!cleanTitle) throw new Error("Title is required");
    const props = db.properties ?? [];
    const required = new Set(view.formRequiredProps ?? []);
    const incoming: Record<string, unknown> = (rowProps && typeof rowProps === "object" ? rowProps : {}) as Record<string, unknown>;
    for (const r of required) {
      const v = incoming[r];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        throw new Error("Missing required field");
      }
    }
    // Strip props the form didn't expose — never accept fields the
    // owner hid (e.g. cost, internal notes). When `formShownProps` is
    // empty, the form exposes every formable prop.
    const shownIds = view.formShownProps && view.formShownProps.length > 0
      ? new Set(view.formShownProps)
      : new Set(props.map((p) => p.id));
    const filteredRowProps: Record<string, unknown> = {};
    for (const k of Object.keys(incoming)) {
      if (shownIds.has(k)) filteredRowProps[k] = incoming[k];
    }

    // unique_id auto-stamp — same logic as databases.addRow.
    let counter = db.uniqueIdCounter ?? 0;
    for (const p of props) {
      if (p.type !== "unique_id") continue;
      counter += 1;
      filteredRowProps[p.id] = p.uniqueIdPrefix ? `${p.uniqueIdPrefix}-${counter}` : String(counter);
    }

    const now = Date.now();
    const rowId = await ctx.db.insert("pages", {
      userId: db.userId,
      // Stamp the DB's workspace so the anonymously-submitted row is visible
      // in team-workspace reads (pagesInActiveWorkspace) and gets cascaded on
      // DB delete — every other row-insert path stamps this. undefined for
      // legacy non-workspace DBs, matching prior behavior for those.
      workspaceId: db.workspaceId,
      parentId: null,
      title: cleanTitle,
      icon: "📝",
      cover: null,
      blocks: [{ id: uid(), type: "paragraph", text: "" }],
      favorite: false,
      trashed: false,
      rowOfDatabaseId: db._id,
      rowProps: filteredRowProps,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(db._id, {
      rowIds: [...db.rowIds, rowId],
      uniqueIdCounter: counter,
      updatedAt: now,
    });
    return { ok: true };
  },
});
