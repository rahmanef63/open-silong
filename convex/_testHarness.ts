/// <reference types="vite/client" />
// convex-test harness. Underscore-prefixed so Convex never treats it as a
// function module or bundles it for deploy; excluded from the convex-runtime
// tsc (it uses Vite's import.meta.glob, which that config doesn't type).
// Handler tests live in convex/_test/*.test.ts and import from here.
import { convexTest } from "convex-test";
import schema from "./schema";

// Give convex-test every function module (root-relative keys → function paths).
const modules = import.meta.glob("./**/!(*.*.*)*.*s");

export function testCtx() {
  return convexTest(schema, modules);
}

/** Seed a user row and return an identity-bound client. `getAuthUserId`
 *  just parses `identity.subject`, and workspace-writing mutations
 *  (pages.create, databases.create, …) auto-provision the personal
 *  workspace + owner membership on first call — so a bare user is enough. */
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
