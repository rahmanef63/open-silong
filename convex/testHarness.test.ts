// @vitest-environment edge-runtime
/// <reference types="vite/client" />
// convex-test harness + its own smoke test. Named *.test.ts on purpose: that
// is the ONLY marker Convex's deploy bundler (and the convex-runtime tsc)
// reliably excludes, so `convex-test` / `import.meta.glob` never reach the
// deployed function bundle. Lives at the convex root so the module glob keys
// are root-relative (./pages.ts -> "pages"), which convex-test maps directly.
// Handler suites in convex/_test/*.test.ts import { testCtx, seedUser } here.
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

export function testCtx() {
  return convexTest(schema, modules);
}

/** Seed a user row and return an identity-bound client. `getAuthUserId` just
 *  parses `identity.subject`, and workspace-writing mutations (pages.create,
 *  databases.create, …) auto-provision the personal workspace + owner
 *  membership on first call — so a bare user is enough to act. */
export async function seedUser(
  t: ReturnType<typeof testCtx>,
  opts: { email?: string; name?: string } = {},
) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: opts.email ?? "test@example.com",
      name: opts.name ?? "Test User",
    }),
  );
  return { userId, asUser: t.withIdentity({ subject: userId }) };
}

test("harness: seedUser yields an authed user who can create a page", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);
  const pageId = await asUser.mutation(api.pages.create, {
    parentId: null,
    title: "Harness",
  });
  expect(pageId).toBeTruthy();
});
