import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { rateLimit } from "./rateLimit";

type Row = { _id: string; userId: string; scope: string; windowStart: number; count: number };
interface QB { eq: (k: string, v: unknown) => QB }

/** Minimal in-memory stand-in for the Convex MutationCtx surface rateLimit
 *  touches: a single-table store queried by (userId, scope). */
function makeCtx() {
  const rows: Row[] = [];
  let seq = 0;
  const db = {
    query: (_table: string) => ({
      withIndex: (_index: string, fn: (q: QB) => QB) => {
        const eqs: Record<string, unknown> = {};
        const q: QB = { eq: (k, v) => { eqs[k] = v; return q; } };
        fn(q);
        return {
          unique: async () =>
            rows.find((r) => r.userId === eqs.userId && r.scope === eqs.scope) ?? null,
        };
      },
    }),
    insert: async (_table: string, doc: Omit<Row, "_id">) => {
      const _id = `r${seq++}`;
      rows.push({ _id, ...doc });
      return _id;
    },
    patch: async (id: string, patch: Partial<Row>) => {
      const r = rows.find((x) => x._id === id);
      if (r) Object.assign(r, patch);
    },
  };
  return { ctx: { db } as unknown as MutationCtx, rows };
}

const USER = "u1" as unknown as Id<"users">;
const cfg = (over: Partial<{ max: number; windowMs: number; scope: string }> = {}) =>
  ({ max: 3, windowMs: 1000, scope: "test.op", ...over });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1500); // window [1000, 2000)
});
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("inserts a fresh bucket on the first call", async () => {
    const { ctx, rows } = makeCtx();
    await rateLimit(ctx, USER, cfg());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 1, windowStart: 1000, scope: "test.op" });
  });

  it("increments within the same window", async () => {
    const { ctx, rows } = makeCtx();
    await rateLimit(ctx, USER, cfg());
    await rateLimit(ctx, USER, cfg());
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
  });

  it("throws once the cap is reached and does not increment further", async () => {
    const { ctx, rows } = makeCtx();
    await rateLimit(ctx, USER, cfg({ max: 2 }));
    await rateLimit(ctx, USER, cfg({ max: 2 }));
    await expect(rateLimit(ctx, USER, cfg({ max: 2 }))).rejects.toThrow(/Rate limit/);
    expect(rows[0].count).toBe(2);
  });

  it("resets the bucket when the window rolls over", async () => {
    const { ctx, rows } = makeCtx();
    await rateLimit(ctx, USER, cfg({ max: 1 }));
    expect(rows[0].count).toBe(1);

    vi.setSystemTime(2500); // new window [2000, 3000)
    await rateLimit(ctx, USER, cfg({ max: 1 })); // resets, no throw
    expect(rows[0]).toMatchObject({ count: 1, windowStart: 2000 });

    await expect(rateLimit(ctx, USER, cfg({ max: 1 }))).rejects.toThrow(/Rate limit/);
  });

  it("buckets are independent per scope", async () => {
    const { ctx, rows } = makeCtx();
    await rateLimit(ctx, USER, cfg({ max: 1, scope: "a" }));
    await expect(rateLimit(ctx, USER, cfg({ max: 1, scope: "a" }))).rejects.toThrow();
    await expect(rateLimit(ctx, USER, cfg({ max: 1, scope: "b" }))).resolves.toBeUndefined();
    expect(rows).toHaveLength(2);
  });

  it("buckets are independent per user", async () => {
    const { ctx } = makeCtx();
    const other = "u2" as unknown as Id<"users">;
    await rateLimit(ctx, USER, cfg({ max: 1 }));
    await expect(rateLimit(ctx, USER, cfg({ max: 1 }))).rejects.toThrow();
    await expect(rateLimit(ctx, other, cfg({ max: 1 }))).resolves.toBeUndefined();
  });
});
