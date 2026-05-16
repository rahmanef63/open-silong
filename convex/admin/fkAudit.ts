/** FK data-integrity audit.
 *
 *  Scans every foreign-key-style string field across the schema and
 *  reports three counts per field:
 *
 *    - validFormat   — string parses as a valid `Id<TABLE>` (Convex
 *                      will accept it; `db.get(id)` would not throw).
 *    - invalidFormat — `db.get(id)` threw → field holds a non-id string,
 *                      blocks future schema-tightening to `v.id(TABLE)`.
 *    - missingTarget — valid format but referenced doc no longer exists
 *                      (orphan reference, not a blocker).
 *
 *  Run before tightening a schema field from `v.string()` → `v.id(...)`.
 *  A zero `invalidFormat` count means the schema flip is safe.
 *
 *  Capped at `AUDIT_SCAN_CAP` rows per table to keep query budget sane.
 *
 *  Trigger from the Convex CLI:
 *    pnpm exec convex run admin/fkAudit:run
 */

import { internalQuery } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";

const AUDIT_SCAN_CAP = 10_000;

interface FieldReport {
  field: string;
  targetTable: string;
  total: number;
  validFormat: number;
  invalidFormat: number;
  missingTarget: number;
  invalidExamples: string[];
  orphanExamples: string[];
}

type Probe = (ctx: Parameters<typeof internalQuery.prototype.handler>[0], id: string) => Promise<"valid" | "orphan" | "invalid">;

async function probeId<T extends TableNames>(
  ctx: { db: { get: (id: Id<T>) => Promise<unknown> } },
  table: T,
  value: string,
): Promise<"valid" | "orphan" | "invalid"> {
  if (!value) return "invalid";
  try {
    const doc = await ctx.db.get(value as Id<T>);
    return doc ? "valid" : "orphan";
  } catch {
    return "invalid";
  }
}

function record(report: FieldReport, kind: "valid" | "orphan" | "invalid", value: string) {
  report.total += 1;
  if (kind === "valid") report.validFormat += 1;
  else if (kind === "orphan") {
    report.validFormat += 1;
    report.missingTarget += 1;
    if (report.orphanExamples.length < 3) report.orphanExamples.push(value);
  } else {
    report.invalidFormat += 1;
    if (report.invalidExamples.length < 5) report.invalidExamples.push(value);
  }
}

export const run = internalQuery({
  args: {},
  handler: async (ctx): Promise<{
    capPerTable: number;
    fields: FieldReport[];
    summary: { totalScanned: number; totalInvalid: number; tightenableNow: string[]; needsCleanup: string[] };
  }> => {
    const fields: FieldReport[] = [];

    // ── pages.parentId → Id<"pages"> | null ──
    {
      const r: FieldReport = { field: "pages.parentId", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("pages").take(AUDIT_SCAN_CAP);
      for (const p of rows) {
        if (p.parentId === null) continue;
        record(r, await probeId(ctx, "pages", p.parentId), p.parentId);
      }
      fields.push(r);
    }

    // ── pages.rowOfDatabaseId → Id<"databases"> ──
    {
      const r: FieldReport = { field: "pages.rowOfDatabaseId", targetTable: "databases", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("pages").take(AUDIT_SCAN_CAP);
      for (const p of rows) {
        if (!p.rowOfDatabaseId) continue;
        record(r, await probeId(ctx, "databases", p.rowOfDatabaseId), p.rowOfDatabaseId);
      }
      fields.push(r);
    }

    // ── pages.databaseHostFor[] → Id<"databases">[] ──
    {
      const r: FieldReport = { field: "pages.databaseHostFor[]", targetTable: "databases", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("pages").take(AUDIT_SCAN_CAP);
      for (const p of rows) {
        for (const dbId of p.databaseHostFor ?? []) {
          record(r, await probeId(ctx, "databases", dbId), dbId);
        }
      }
      fields.push(r);
    }

    // ── comments.pageId → Id<"pages"> ──
    {
      const r: FieldReport = { field: "comments.pageId", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("comments").take(AUDIT_SCAN_CAP);
      for (const c of rows) {
        record(r, await probeId(ctx, "pages", c.pageId), c.pageId);
      }
      fields.push(r);
    }

    // ── snapshots.pageId → Id<"pages"> ──
    {
      const r: FieldReport = { field: "snapshots.pageId", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("snapshots").take(AUDIT_SCAN_CAP);
      for (const s of rows) {
        record(r, await probeId(ctx, "pages", s.pageId), s.pageId);
      }
      fields.push(r);
    }

    // ── recents.pageIds[] → Id<"pages">[] ──
    {
      const r: FieldReport = { field: "recents.pageIds[]", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("recents").take(AUDIT_SCAN_CAP);
      for (const row of rows) {
        for (const pid of row.pageIds ?? []) {
          record(r, await probeId(ctx, "pages", pid), pid);
        }
      }
      fields.push(r);
    }

    // ── notifications.pageId → Id<"pages"> ──
    {
      const r: FieldReport = { field: "notifications.pageId", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("notifications").take(AUDIT_SCAN_CAP);
      for (const n of rows) {
        if (!n.pageId) continue;
        record(r, await probeId(ctx, "pages", n.pageId), n.pageId);
      }
      fields.push(r);
    }

    // ── databases.rowIds[] → Id<"pages">[] ──
    {
      const r: FieldReport = { field: "databases.rowIds[]", targetTable: "pages", total: 0, validFormat: 0, invalidFormat: 0, missingTarget: 0, invalidExamples: [], orphanExamples: [] };
      const rows = await ctx.db.query("databases").take(AUDIT_SCAN_CAP);
      for (const d of rows) {
        for (const rid of d.rowIds ?? []) {
          record(r, await probeId(ctx, "pages", rid), rid);
        }
      }
      fields.push(r);
    }

    const totalScanned = fields.reduce((n, f) => n + f.total, 0);
    const totalInvalid = fields.reduce((n, f) => n + f.invalidFormat, 0);
    const tightenableNow = fields.filter((f) => f.invalidFormat === 0).map((f) => f.field);
    const needsCleanup = fields.filter((f) => f.invalidFormat > 0).map((f) => f.field);

    return {
      capPerTable: AUDIT_SCAN_CAP,
      fields,
      summary: { totalScanned, totalInvalid, tightenableNow, needsCleanup },
    };
  },
});
