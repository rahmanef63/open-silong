// @vitest-environment edge-runtime
//
// Per-page grants (v1, flat). Security-critical: the grant authz surface in
// convex/_shared/pageGrants.ts (canReadPage / requirePageWritable) + the
// grant-management gate in convex/pageGrants.ts (grant / revoke / list).
//
// Error strings are the gate literals: "Tidak berwenang" (FORBIDDEN — can
// read but not write) and "Tidak ditemukan" (NOT_FOUND — hidden / non-member).
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../testHarness.test";

// ---------------------------------------------------------------------------
// (1) A VIEWER grant lets the grantee READ via getById but NOT update.
// ---------------------------------------------------------------------------
test("viewer grant reads the page via getById but cannot update it", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const grantee = await seedUser(t, { email: "viewer@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Shared Doc" });

  // Before any grant, the grantee (non-member) cannot see the page.
  expect(await grantee.asUser.query(api.pages.getById, { id: pageId })).toBeNull();

  await owner.asUser.mutation(api.pageGrants.grant, {
    pageId,
    email: "viewer@example.com",
    role: "viewer",
  });

  // Now readable.
  const seen = await grantee.asUser.query(api.pages.getById, { id: pageId });
  expect(seen).not.toBeNull();
  expect(seen?.title).toBe("Shared Doc");

  // But a viewer grant is read-only → update rejects with FORBIDDEN.
  await expect(
    grantee.asUser.mutation(api.pages.update, { pageId, patch: { title: "hijacked" } }),
  ).rejects.toThrow(/Tidak berwenang/);

  // State unchanged — the write never landed.
  expect((await owner.asUser.query(api.pages.getById, { id: pageId }))?.title).toBe("Shared Doc");
});

// ---------------------------------------------------------------------------
// (2) An EDITOR grant lets the grantee READ + UPDATE page content, but NOT
//     trash / permanentlyDelete / manage grants.
// ---------------------------------------------------------------------------
test("editor grant reads + updates content but cannot trash/permanentlyDelete/grant", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const grantee = await seedUser(t, { email: "editor@example.com" });
  await seedUser(t, { email: "third@example.com" }); // grant target for the escalation probe

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Doc" });

  await owner.asUser.mutation(api.pageGrants.grant, {
    pageId,
    email: "editor@example.com",
    role: "editor",
  });

  // Reads.
  expect((await grantee.asUser.query(api.pages.getById, { id: pageId }))?.title).toBe("Doc");

  // Writes content (title is inside the content whitelist).
  await grantee.asUser.mutation(api.pages.update, { pageId, patch: { title: "Edited by grantee" } });
  expect((await owner.asUser.query(api.pages.getById, { id: pageId }))?.title).toBe("Edited by grantee");

  // Block-level content write also works via the editor grant.
  const page = await grantee.asUser.query(api.pages.getById, { id: pageId });
  const firstBlockId = (page?.blocks?.[0] as { id: string }).id;
  await grantee.asUser.mutation(api.pages.updateBlock, {
    pageId,
    blockId: firstBlockId,
    patch: { text: "grantee wrote this" },
  });

  // But the editor grant is BOUNDED — lifecycle + grant-management stay
  // workspace-only (grant-blind gate → grantee is not a member → NOT_FOUND).
  await expect(
    grantee.asUser.mutation(api.pages.trash, { pageId }),
  ).rejects.toThrow(/Tidak ditemukan/);
  await expect(
    grantee.asUser.mutation(api.pages.permanentlyDelete, { pageId }),
  ).rejects.toThrow(/Tidak ditemukan/);
  await expect(
    grantee.asUser.mutation(api.pageGrants.grant, {
      pageId,
      email: "third@example.com",
      role: "viewer",
    }),
  ).rejects.toThrow(/Tidak ditemukan/);

  // Page still alive + not trashed after the rejected lifecycle calls.
  const after = await owner.asUser.query(api.pages.getById, { id: pageId });
  expect(after).not.toBeNull();
  expect(after?.trashed).toBe(false);
});

// ---------------------------------------------------------------------------
// (3) Revoke removes both read and write access.
// ---------------------------------------------------------------------------
test("revoke removes the grantee's read + write access", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const grantee = await seedUser(t, { email: "editor@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Doc" });
  await owner.asUser.mutation(api.pageGrants.grant, { pageId, email: "editor@example.com", role: "editor" });

  // Sanity: access before revoke.
  expect(await grantee.asUser.query(api.pages.getById, { id: pageId })).not.toBeNull();

  const res = await owner.asUser.mutation(api.pageGrants.revoke, { pageId, userId: grantee.userId });
  expect(res.revoked).toBe(true);

  // Read gone (null), write gone (NOT_FOUND — no grant, not a member).
  expect(await grantee.asUser.query(api.pages.getById, { id: pageId })).toBeNull();
  await expect(
    grantee.asUser.mutation(api.pages.update, { pageId, patch: { title: "x" } }),
  ).rejects.toThrow(/Tidak ditemukan/);
});

// ---------------------------------------------------------------------------
// (4) A non-grantee, non-member is denied read (null) + write (reject).
// ---------------------------------------------------------------------------
test("a non-grantee non-member is denied read and write", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const stranger = await seedUser(t, { email: "stranger@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Private" });

  expect(await stranger.asUser.query(api.pages.getById, { id: pageId })).toBeNull();
  await expect(
    stranger.asUser.mutation(api.pages.update, { pageId, patch: { title: "x" } }),
  ).rejects.toThrow(/Tidak ditemukan/);
});

// ---------------------------------------------------------------------------
// (5) Only owner / workspace-writable member can grant. A grantee or a
//     stranger cannot manage grants (grant-blind gate).
// ---------------------------------------------------------------------------
test("only owner/workspace-writable can grant; strangers and grantees cannot", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const stranger = await seedUser(t, { email: "stranger@example.com" });
  await seedUser(t, { email: "victim@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Doc" });

  // A stranger cannot grant.
  await expect(
    stranger.asUser.mutation(api.pageGrants.grant, {
      pageId,
      email: "victim@example.com",
      role: "editor",
    }),
  ).rejects.toThrow(/Tidak ditemukan/);

  // Owner can — and list reflects the single grant with the grantee email.
  await owner.asUser.mutation(api.pageGrants.grant, { pageId, email: "victim@example.com", role: "viewer" });
  const grants = await owner.asUser.query(api.pageGrants.list, { pageId });
  expect(grants.length).toBe(1);
  expect(grants[0].email).toBe("victim@example.com");
  expect(grants[0].role).toBe("viewer");

  // A stranger cannot even list.
  await expect(
    stranger.asUser.query(api.pageGrants.list, { pageId }),
  ).rejects.toThrow(/Tidak ditemukan/);
});

// ---------------------------------------------------------------------------
// (6) Grant to a non-existent email throws a clear "No account" error (no
//     invite / provisioning in v1).
// ---------------------------------------------------------------------------
test("granting to an email with no account throws No account", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Doc" });

  await expect(
    owner.asUser.mutation(api.pageGrants.grant, {
      pageId,
      email: "ghost@example.com",
      role: "viewer",
    }),
  ).rejects.toThrow(/No account/);
});

// ---------------------------------------------------------------------------
// (7) sharedWithMe surfaces granted pages to the grantee; trashed pages drop.
// ---------------------------------------------------------------------------
test("sharedWithMe lists granted pages with grantRole and excludes trashed", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const grantee = await seedUser(t, { email: "viewer@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Shared" });

  // No grant yet → empty feed.
  expect((await grantee.asUser.query(api.pages.sharedWithMe, {})).length).toBe(0);

  await owner.asUser.mutation(api.pageGrants.grant, { pageId, email: "viewer@example.com", role: "viewer" });

  const feed = await grantee.asUser.query(api.pages.sharedWithMe, {});
  expect(feed.length).toBe(1);
  expect(feed[0]._id).toBe(pageId);
  expect(feed[0].title).toBe("Shared");
  expect(feed[0].grantRole).toBe("viewer");

  // Owner trashes the page → drops out of the grantee's shared feed.
  await owner.asUser.mutation(api.pages.trash, { pageId });
  expect((await grantee.asUser.query(api.pages.sharedWithMe, {})).length).toBe(0);
});

// ---------------------------------------------------------------------------
// (8) Grant upserts the role in place (viewer → editor promotes write access).
// ---------------------------------------------------------------------------
test("re-granting the same user upserts the role (viewer -> editor)", async () => {
  const t = testCtx();
  const owner = await seedUser(t, { email: "owner@example.com" });
  const grantee = await seedUser(t, { email: "user@example.com" });

  const pageId = await owner.asUser.mutation(api.pages.create, { parentId: null, title: "Doc" });

  // First a viewer grant — read only.
  await owner.asUser.mutation(api.pageGrants.grant, { pageId, email: "user@example.com", role: "viewer" });
  await expect(
    grantee.asUser.mutation(api.pages.update, { pageId, patch: { title: "nope" } }),
  ).rejects.toThrow(/Tidak berwenang/);

  // Re-grant as editor — upsert, no duplicate row, now writable.
  const res = await owner.asUser.mutation(api.pageGrants.grant, { pageId, email: "user@example.com", role: "editor" });
  expect(res.updated).toBe(true);

  await owner.asUser.query(api.pageGrants.list, { pageId }).then((g) => {
    expect(g.length).toBe(1);
    expect(g[0].role).toBe("editor");
  });

  await grantee.asUser.mutation(api.pages.update, { pageId, patch: { title: "now allowed" } });
  expect((await owner.asUser.query(api.pages.getById, { id: pageId }))?.title).toBe("now allowed");
});
