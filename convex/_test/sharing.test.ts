// @vitest-environment edge-runtime
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../_testHarness";

// ── Helpers ───────────────────────────────────────────────────────────
// A slug with a hyphen never matches getPublicShare's convex-id regex
// (/^[a-z0-9]{20,}$/i) so it always flows down the by_share_slug lookup.
const SLUG = "my-shared-page";

test("a public page with a share slug resolves via the public read path", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Shared Doc",
  });
  await asUser.mutation(api.pages.setPublic, { pageId, isPublic: true });
  const setRes = await asUser.mutation(api.pages.setShareSlug, {
    pageId,
    slug: SLUG,
  });
  expect(setRes.slug).toBe(SLUG);

  // Anonymous (unauthenticated) public read by slug resolves the page.
  const bySlug = await t.query(api.pages.getPublicShare, { id: SLUG });
  expect(bySlug).not.toBeNull();
  expect(bySlug?._id).toBe(pageId);
  expect(bySlug?.title).toBe("Shared Doc");
  expect(bySlug?.shareSlug).toBe(SLUG);
  // DTO must not leak owner identity to anonymous readers.
  expect(bySlug).not.toHaveProperty("userId");

  // Also resolvable by its convex id while public.
  const byId = await t.query(api.pages.getPublicShare, { id: pageId });
  expect(byId?._id).toBe(pageId);

  // Unpublishing makes it no longer resolvable, by slug OR by id.
  await asUser.mutation(api.pages.setPublic, { pageId, isPublic: false });
  expect(await t.query(api.pages.getPublicShare, { id: SLUG })).toBeNull();
  expect(await t.query(api.pages.getPublicShare, { id: pageId })).toBeNull();
});

test("clearing the share slug makes it no longer resolvable by that slug", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Temp Share",
  });
  await asUser.mutation(api.pages.setPublic, { pageId, isPublic: true });
  await asUser.mutation(api.pages.setShareSlug, { pageId, slug: "removable-slug" });

  // Sanity: resolvable before clearing.
  expect(
    (await t.query(api.pages.getPublicShare, { id: "removable-slug" }))?._id,
  ).toBe(pageId);

  // Empty string clears the slug.
  const cleared = await asUser.mutation(api.pages.setShareSlug, {
    pageId,
    slug: "",
  });
  expect(cleared.slug).toBeNull();

  // No longer resolvable by the old slug…
  expect(
    await t.query(api.pages.getPublicShare, { id: "removable-slug" }),
  ).toBeNull();
  // …but the page still exists and is public, so id resolution still works.
  expect(
    (await t.query(api.pages.getPublicShare, { id: pageId }))?.shareSlug,
  ).toBeUndefined();
});

test("setShareSlug rejects a slug already taken by another page (collision)", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageA = await asUser.mutation(api.pages.create, { parentId: null, title: "A" });
  const pageB = await asUser.mutation(api.pages.create, { parentId: null, title: "B" });

  await asUser.mutation(api.pages.setShareSlug, { pageId: pageA, slug: "unique-one" });
  // Same slug on a different page must throw.
  await expect(
    asUser.mutation(api.pages.setShareSlug, { pageId: pageB, slug: "unique-one" }),
  ).rejects.toThrow();

  // Re-setting the SAME slug on the SAME page is idempotent (not a collision).
  const same = await asUser.mutation(api.pages.setShareSlug, {
    pageId: pageA,
    slug: "unique-one",
  });
  expect(same.slug).toBe("unique-one");
});

test("setShareSlug rejects a non-member of the page's workspace (authz)", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const { asUser: asStranger } = await seedUser(t, { email: "stranger@example.com" });

  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Owned",
  });

  // A different authed user who is not a member cannot set the slug.
  await expect(
    asStranger.mutation(api.pages.setShareSlug, { pageId, slug: "steal-slug" }),
  ).rejects.toThrow();

  // Confirm the slug was never applied — still unresolvable.
  await asUser.mutation(api.pages.setPublic, { pageId, isPublic: true });
  expect(await t.query(api.pages.getPublicShare, { id: "steal-slug" })).toBeNull();
});

test("setShareSlug rejects an invalid slug (validator/edge case)", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Doc",
  });

  // Contains an underscore — outside the [a-z0-9-] slug charset.
  await expect(
    asUser.mutation(api.pages.setShareSlug, { pageId, slug: "bad_slug" }),
  ).rejects.toThrow();

  // Too short — below CHAR_CAPS.shareSlugMin (3).
  await expect(
    asUser.mutation(api.pages.setShareSlug, { pageId, slug: "ab" }),
  ).rejects.toThrow();
});
