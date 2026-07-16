// @vitest-environment edge-runtime
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../_testHarness";

// ── Happy path: create seeds a page + getById returns the editor DTO ──
test("create seeds a page; getById returns a DTO with title/icon/layouts/blocks", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Roadmap",
    icon: "lucide:Map",
  });
  expect(pageId).toBeTruthy();

  const page = await asUser.query(api.pages.getById, { id: pageId });
  expect(page).not.toBeNull();
  expect(page?.title).toBe("Roadmap");
  expect(page?.icon).toBe("lucide:Map");
  // layouts is unset on a fresh page (Convex drops undefined keys from the
  // query result); the layouts round-trip is asserted in the update test.
  expect(page?.layouts).toBeUndefined();
  // create() seeds exactly one empty paragraph block via insertPageBlocks.
  expect(Array.isArray(page?.blocks)).toBe(true);
  expect(page?.blocks?.length).toBe(1);
});

// ── update / rename + layouts round-trip ──
test("update renames the page and round-trips layouts", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Draft" });

  const layouts = [{ id: "col-1", type: "columns" as const, count: 2 }];
  await asUser.mutation(api.pages.update, {
    pageId,
    patch: { title: "Renamed", layouts },
  });

  const page = await asUser.query(api.pages.getById, { id: pageId });
  expect(page?.title).toBe("Renamed");
  expect(page?.layouts).toEqual(layouts);
});

// ── listMeta surfaces the created page's meta ──
test("listMeta returns the created page's meta", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Findable" });

  const metas = await asUser.query(api.pages.listMeta, {});
  const mine = metas.find((m) => m._id === pageId);
  expect(mine).toBeTruthy();
  expect(mine?.title).toBe("Findable");
  // Slim projection still carries the sidebar-render fields.
  expect(mine && "icon" in mine).toBe(true);
  expect(mine?.trashed).toBe(false);
});

// ── trash + restore state transition (leaf page; sibling untouched) ──
test("trash then restore toggles trashed; a sibling is untouched", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Target" });
  const siblingId = await asUser.mutation(api.pages.create, { parentId: null, title: "Sibling" });

  await asUser.mutation(api.pages.trash, { pageId });
  expect((await asUser.query(api.pages.getById, { id: pageId }))?.trashed).toBe(true);
  expect((await asUser.query(api.pages.getById, { id: siblingId }))?.trashed).toBe(false);

  await asUser.mutation(api.pages.restore, { pageId });
  expect((await asUser.query(api.pages.getById, { id: pageId }))?.trashed).toBe(false);
});

// ── permanentlyDelete removes the targeted page (leaf); sibling survives ──
test("permanentlyDelete removes the page and leaves other pages", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Doomed" });
  const siblingId = await asUser.mutation(api.pages.create, { parentId: null, title: "Survivor" });

  await asUser.mutation(api.pages.permanentlyDelete, { pageId });

  expect(await asUser.query(api.pages.getById, { id: pageId })).toBeNull();
  expect(await asUser.query(api.pages.getById, { id: siblingId })).not.toBeNull();

  const metas = await asUser.query(api.pages.listMeta, {});
  expect(metas.find((m) => m._id === pageId)).toBeUndefined();
  expect(metas.find((m) => m._id === siblingId)).toBeTruthy();
});

// ── Regression: nested-subtree cascade (collectDescendantIds). Before the
// .paginate()->.take() fix this threw "Only a single paginated query is
// allowed per function execution" for ANY page with a descendant. ──
test("trash cascades through a multi-level subtree without a paginate error", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const parent = await asUser.mutation(api.pages.create, { parentId: null, title: "Parent" });
  const childA = await asUser.mutation(api.pages.create, { parentId: parent, title: "Child A" });
  const childB = await asUser.mutation(api.pages.create, { parentId: parent, title: "Child B" });
  const grandchild = await asUser.mutation(api.pages.create, { parentId: childA, title: "Grandchild" });

  // Two direct children + a grandchild => >1 BFS level => >1 paginate call
  // under the old code. Must not throw and must cascade to every descendant.
  await asUser.mutation(api.pages.trash, { pageId: parent });

  for (const id of [parent, childA, childB, grandchild]) {
    expect((await asUser.query(api.pages.getById, { id }))?.trashed).toBe(true);
  }

  // restore cascades back too.
  await asUser.mutation(api.pages.restore, { pageId: parent });
  expect((await asUser.query(api.pages.getById, { id: grandchild }))?.trashed).toBe(false);
});

// ── AUTHZ: a page owned by another user is not returned (non-member) ──
test("getById does not return a page owned by a different user", async () => {
  const t = testCtx();
  const { asUser: userA } = await seedUser(t, { email: "a@example.com" });
  const { asUser: userB } = await seedUser(t, { email: "b@example.com" });

  const pageId = await userA.mutation(api.pages.create, { parentId: null, title: "Private" });

  // Owner reads it fine; a non-member of the workspace gets null (no leak).
  expect(await userA.query(api.pages.getById, { id: pageId })).not.toBeNull();
  expect(await userB.query(api.pages.getById, { id: pageId })).toBeNull();
});

// ── AUTHZ: unauthenticated reads return null, writes reject ──
test("getById returns null for an unauthenticated caller", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Secret" });

  expect(await t.query(api.pages.getById, { id: pageId })).toBeNull();
});

test("update rejects an unauthenticated caller", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "Secret" });

  await expect(
    t.mutation(api.pages.update, { pageId, patch: { title: "hijacked" } }),
  ).rejects.toThrow();
});

// ── Validator / edge case: title over the length cap is rejected ──
test("update rejects a title over the length cap", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const pageId = await asUser.mutation(api.pages.create, { parentId: null, title: "ok" });

  await expect(
    asUser.mutation(api.pages.update, { pageId, patch: { title: "x".repeat(201) } }),
  ).rejects.toThrow();

  // State unchanged after the rejected write.
  const page = await asUser.query(api.pages.getById, { id: pageId });
  expect(page?.title).toBe("ok");
});
