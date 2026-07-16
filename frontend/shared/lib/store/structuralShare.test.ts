import { describe, expect, it } from "vitest";
import { reconcileStructural, type CacheEntry } from "./structuralShare";

interface Row { id: string; title: string; trashed?: boolean; updatedAt: number }
const idMap = (r: Row) => r; // identity map — the raw already has {id}

describe("reconcileStructural", () => {
  it("preserves object identity for unchanged rows across pushes", () => {
    const a = { id: "1", title: "A", updatedAt: 10 };
    const b = { id: "2", title: "B", updatedAt: 20 };
    const first = reconcileStructural([a, b], idMap, new Map());
    // Simulate a fresh Convex push: same content, brand-new object references.
    const a2 = { id: "1", title: "A", updatedAt: 10 };
    const b2 = { id: "2", title: "B", updatedAt: 20 };
    const second = reconcileStructural([a2, b2], idMap, first.next);
    expect(second.out[0]).toBe(first.out[0]); // reused, not the fresh a2
    expect(second.out[1]).toBe(first.out[1]);
  });

  it("rebuilds only the row whose content changed", () => {
    const first = reconcileStructural(
      [{ id: "1", title: "A", updatedAt: 10 }, { id: "2", title: "B", updatedAt: 20 }],
      idMap, new Map(),
    );
    const second = reconcileStructural(
      [{ id: "1", title: "A", updatedAt: 10 }, { id: "2", title: "B EDITED", updatedAt: 21 }],
      idMap, first.next,
    );
    expect(second.out[0]).toBe(first.out[0]); // unchanged → reused
    expect(second.out[1]).not.toBe(first.out[1]); // changed → new identity
  });

  it("rebuilds when trashed flips even though updatedAt is unchanged (restore case)", () => {
    // convex pages.restore patches {trashed:false} WITHOUT bumping updatedAt —
    // an updatedAt-keyed cache would wrongly serve the stale trashed object.
    const first = reconcileStructural(
      [{ id: "1", title: "A", trashed: true, updatedAt: 10 }], idMap, new Map(),
    );
    const second = reconcileStructural(
      [{ id: "1", title: "A", trashed: false, updatedAt: 10 }], idMap, first.next,
    );
    expect(second.out[0]).not.toBe(first.out[0]);
    expect(second.out[0].trashed).toBe(false);
  });

  it("prunes deleted ids from the cache", () => {
    const first = reconcileStructural(
      [{ id: "1", title: "A", updatedAt: 1 }, { id: "2", title: "B", updatedAt: 1 }],
      idMap, new Map(),
    );
    const second = reconcileStructural(
      [{ id: "1", title: "A", updatedAt: 1 }], idMap, first.next,
    );
    expect(second.next.has("2")).toBe(false);
    expect(second.next.has("1")).toBe(true);
  });

  it("empty input yields empty output + empty cache", () => {
    const seeded = new Map<string, CacheEntry<Row>>([["1", { sig: "x", obj: { id: "1", title: "A", updatedAt: 1 } }]]);
    const r = reconcileStructural<Row, Row>([], idMap, seeded);
    expect(r.out).toEqual([]);
    expect(r.next.size).toBe(0);
  });
});
