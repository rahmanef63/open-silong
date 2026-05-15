import { describe, it, expect } from "vitest";
import type { Block, Page } from "@/shared/types/domain";
import { findSyncedSource } from "./syncedBlocks";

const SYNC_A = "syncA";
const SYNC_B = "syncB";

const para = (id: string, text = ""): Block => ({ id, type: "paragraph", text });
const sourceBlock = (id: string, syncId: string, children: Block[] = []): Block => ({
  id, type: "synced", text: "", syncId, children,
});
const refBlock = (id: string, syncId: string): Block => ({
  id, type: "synced", text: "", syncId, syncRef: true,
});
const toggle = (id: string, children: Block[]): Block => ({
  id, type: "toggle", text: "", children, collapsed: false,
});
const cols2 = (id: string, c0: Block[], c1: Block[]): Block => ({
  id, type: "columns2", text: "", columns: [c0, c1],
});

const mkPage = (id: string, blocks: Block[], extra: Partial<Page> = {}): Page => ({
  id, title: id, icon: "", cover: "", trashed: false, blocks,
  ...extra,
} as Page);

describe("findSyncedSource", () => {
  it("returns null when no source matches", () => {
    const pages = [mkPage("p1", [para("a")])];
    expect(findSyncedSource(SYNC_A, pages)).toBeNull();
  });

  it("finds top-level source on a page", () => {
    const src = sourceBlock("s1", SYNC_A, [para("c1")]);
    const pages = [mkPage("p1", [para("a"), src])];
    const res = findSyncedSource(SYNC_A, pages);
    expect(res?.block).toBe(src);
    expect(res?.page.id).toBe("p1");
    expect(res?.cycle).toBe(false);
  });

  it("finds source nested inside a toggle", () => {
    const src = sourceBlock("s2", SYNC_A);
    const pages = [mkPage("p1", [toggle("T", [src])])];
    expect(findSyncedSource(SYNC_A, pages)?.block).toBe(src);
  });

  it("finds source nested inside a column", () => {
    const src = sourceBlock("s3", SYNC_A);
    const pages = [mkPage("p1", [cols2("C", [src], [para("x")])])];
    expect(findSyncedSource(SYNC_A, pages)?.block).toBe(src);
  });

  it("ignores ref blocks (only true sources match)", () => {
    const ref = refBlock("r1", SYNC_A);
    const src = sourceBlock("s1", SYNC_A);
    const pages = [mkPage("p1", [ref]), mkPage("p2", [src])];
    expect(findSyncedSource(SYNC_A, pages)?.block).toBe(src);
  });

  it("skips trashed pages", () => {
    const src = sourceBlock("s1", SYNC_A);
    const pages = [mkPage("p1", [src], { trashed: true })];
    expect(findSyncedSource(SYNC_A, pages)).toBeNull();
  });

  it("excludeBlockId skips a specific block during the walk", () => {
    const src = sourceBlock("s1", SYNC_A);
    const pages = [mkPage("p1", [src])];
    expect(findSyncedSource(SYNC_A, pages, { excludeBlockId: "s1" })).toBeNull();
  });

  describe("cycle detection", () => {
    it("flags cycle when source children directly contain a ref to the same syncId", () => {
      const src = sourceBlock("s1", SYNC_A, [refBlock("r1", SYNC_A)]);
      const pages = [mkPage("p1", [src])];
      expect(findSyncedSource(SYNC_A, pages)?.cycle).toBe(true);
    });

    it("flags cycle when ref is nested deeper inside source children", () => {
      const src = sourceBlock("s1", SYNC_A, [
        toggle("T", [refBlock("r1", SYNC_A)]),
      ]);
      const pages = [mkPage("p1", [src])];
      expect(findSyncedSource(SYNC_A, pages)?.cycle).toBe(true);
    });

    it("flags cycle when ref is nested inside a column of source children", () => {
      const src = sourceBlock("s1", SYNC_A, [
        cols2("C", [refBlock("r1", SYNC_A)], [para("x")]),
      ]);
      const pages = [mkPage("p1", [src])];
      expect(findSyncedSource(SYNC_A, pages)?.cycle).toBe(true);
    });

    it("does NOT flag cycle when nested ref points to a DIFFERENT syncId", () => {
      const src = sourceBlock("s1", SYNC_A, [refBlock("r1", SYNC_B)]);
      const pages = [mkPage("p1", [src])];
      expect(findSyncedSource(SYNC_A, pages)?.cycle).toBe(false);
    });
  });

  describe("cross-workspace gate", () => {
    it("excludes pages whose workspaceId differs from viewerWorkspaceId", () => {
      const src = sourceBlock("s1", SYNC_A);
      const pages = [mkPage("p1", [src], { workspaceId: "ws-other" } as Partial<Page>)];
      expect(
        findSyncedSource(SYNC_A, pages, { viewerWorkspaceId: "ws-mine" }),
      ).toBeNull();
    });

    it("includes pages whose workspaceId matches viewerWorkspaceId", () => {
      const src = sourceBlock("s1", SYNC_A);
      const pages = [mkPage("p1", [src], { workspaceId: "ws-mine" } as Partial<Page>)];
      expect(
        findSyncedSource(SYNC_A, pages, { viewerWorkspaceId: "ws-mine" })?.block,
      ).toBe(src);
    });

    it("includes pages with no workspaceId (legacy data passthrough) regardless of viewerWorkspaceId", () => {
      const src = sourceBlock("s1", SYNC_A);
      const pages = [mkPage("p1", [src])];
      expect(
        findSyncedSource(SYNC_A, pages, { viewerWorkspaceId: "ws-mine" })?.block,
      ).toBe(src);
    });

    it("when viewerWorkspaceId is omitted, no workspace filtering happens", () => {
      const src = sourceBlock("s1", SYNC_A);
      const pages = [mkPage("p1", [src], { workspaceId: "ws-other" } as Partial<Page>)];
      expect(findSyncedSource(SYNC_A, pages)?.block).toBe(src);
    });
  });
});
