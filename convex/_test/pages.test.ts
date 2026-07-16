// @vitest-environment edge-runtime
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../_testHarness";

test("authed user creates a page in an auto-provisioned workspace", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Hello",
  });
  expect(pageId).toBeTruthy();
  const page = await asUser.query(api.pages.getById, { id: pageId });
  expect(page?.title).toBe("Hello");
});

test("pages.create rejects an unauthenticated caller", async () => {
  const t = testCtx();
  await expect(
    t.mutation(api.pages.create, { parentId: null, title: "x" }),
  ).rejects.toThrow();
});
