// @vitest-environment edge-runtime
//
// Security-critical: the workspace membership gate in
// convex/_shared/workspace.ts. Covers both entry points —
//   requireWorkspaceMember          (explicit workspaceId; used by
//                                     workspaces.rename/setIcon/remove/…)
//   requireActiveWorkspaceWritable  (active-workspace write gate; used by
//                                     pages.create / databases.create / …)
//
// Assertions track real handler behavior read back from the store; error
// strings are the literals thrown by the gate ("Tidak ditemukan" = not a
// member / not found, "Tidak berwenang" = viewer role forbidden).
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../_testHarness";

// ---------------------------------------------------------------------------
// (1) Happy path — an owner-member can perform workspace-scoped writes.
// ---------------------------------------------------------------------------

test("owner member passes requireActiveWorkspaceWritable and creates a page", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  // pages.create → requireActiveWorkspaceWritable. seedUser auto-provisions the
  // personal workspace + owner membership on this first workspace-writing call.
  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Owned",
  });
  expect(pageId).toBeTruthy();
  const page = await asUser.query(api.pages.getById, { id: pageId });
  expect(page?.title).toBe("Owned");
});

test("owner member passes requireWorkspaceMember and renames the workspace", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  // Non-personal workspace; caller becomes owner.
  const workspaceId = await asUser.mutation(api.workspaces.create, {
    name: "Team",
  });
  await asUser.mutation(api.workspaces.rename, {
    workspaceId,
    name: "Renamed Team",
  });
  const ws = await t.run(async (ctx) => ctx.db.get(workspaceId));
  expect(ws?.name).toBe("Renamed Team");
});

// ---------------------------------------------------------------------------
// (2) Non-member rejection — a second user cannot touch the first user's
//     workspace-scoped entity. requireWorkspaceMember throws "Tidak ditemukan".
// ---------------------------------------------------------------------------

test("non-member is rejected when renaming another user's workspace", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const stranger = await seedUser(t, { email: "stranger@example.com" });

  const workspaceId = await owner.asUser.mutation(api.workspaces.create, {
    name: "Private WS",
  });

  await expect(
    stranger.asUser.mutation(api.workspaces.rename, {
      workspaceId,
      name: "Hijacked",
    }),
  ).rejects.toThrow(/Tidak ditemukan/);

  // State unchanged — the write never landed.
  const ws = await t.run(async (ctx) => ctx.db.get(workspaceId));
  expect(ws?.name).toBe("Private WS");
});

// ---------------------------------------------------------------------------
// (3) Unauthenticated rejection — no identity → requireAuth throws.
// ---------------------------------------------------------------------------

test("unauthenticated caller is rejected by the membership gate", async () => {
  const t = testCtx();
  const owner = await seedUser(t);
  const workspaceId = await owner.asUser.mutation(api.workspaces.create, {
    name: "Locked",
  });

  await expect(
    t.mutation(api.workspaces.rename, { workspaceId, name: "x" }),
  ).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// (4) Viewer-role rejection — a viewer member of the ACTIVE workspace is
//     blocked from writes. requireActiveWorkspaceWritable throws
//     "Tidak berwenang" (FORBIDDEN) for role "viewer".
// ---------------------------------------------------------------------------

test("viewer-role member is rejected by requireActiveWorkspaceWritable", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const viewer = await seedUser(t, { email: "viewer@example.com" });

  // Owner-created shared workspace.
  const workspaceId = await owner.asUser.mutation(api.workspaces.create, {
    name: "Shared",
  });

  // Make `viewer` a viewer-role member of that workspace, and point their
  // active workspace at it — so requireActiveWorkspaceWritable resolves to
  // this workspace and reads back role "viewer".
  await t.run(async (ctx) => {
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: viewer.userId,
      role: "viewer",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("userProfiles", {
      userId: viewer.userId,
      role: "user",
      createdAt: Date.now(),
      activeWorkspaceId: workspaceId,
    });
  });

  await expect(
    viewer.asUser.mutation(api.pages.create, { parentId: null, title: "nope" }),
  ).rejects.toThrow(/Tidak berwenang/);

  // No page was inserted into the shared workspace by the viewer.
  const pageCount = await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("pages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    return rows.length;
  });
  expect(pageCount).toBe(0);
});

// ---------------------------------------------------------------------------
// (5) Validator / edge case — handler input guard rejects an empty name
//     before any workspace row is written.
// ---------------------------------------------------------------------------

test("workspaces.create rejects an empty name", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  await expect(
    asUser.mutation(api.workspaces.create, { name: "   " }),
  ).rejects.toThrow(/Name required/);
});
