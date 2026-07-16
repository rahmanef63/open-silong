// @vitest-environment edge-runtime
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { testCtx, seedUser } from "../testHarness.test";

// ── Happy path: create a database ─────────────────────────────────────
test("create seeds a database in the active workspace (empty rowIds)", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const dbId = await asUser.mutation(api.databases.create, { name: "Tasks" });
  expect(dbId).toBeTruthy();

  const dbs = await asUser.query(api.databases.list, {});
  const db = dbs.find((d) => d._id === dbId);
  expect(db).toBeTruthy();
  expect(db?.name).toBe("Tasks");
  expect(db?.rowIds).toEqual([]);
  // create seeds a Name (text) + Status property and one Table view.
  expect((db?.properties?.length ?? 0)).toBeGreaterThanOrEqual(2);
  expect((db?.views?.length ?? 0)).toBeGreaterThanOrEqual(1);
});

// ── Validator / edge case: optional `name` defaults ───────────────────
test("create with no name defaults to 'Untitled database'", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const dbId = await asUser.mutation(api.databases.create, {});
  const dbs = await asUser.query(api.databases.list, {});
  const db = dbs.find((d) => d._id === dbId);
  expect(db?.name).toBe("Untitled database");
});

// ── Happy path: addRow makes a page with rowOfDatabaseId + appends ────
test("addRow inserts a row page and appends its id to database.rowIds", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const dbId = await asUser.mutation(api.databases.create, {});
  const rowId = await asUser.mutation(api.databases.addRow, { dbId });
  expect(rowId).toBeTruthy();

  // The row is a page carrying rowOfDatabaseId back to its database.
  const row = await asUser.query(api.pages.getById, { id: rowId });
  expect(row?.rowOfDatabaseId).toBe(dbId);

  // The database now references the new row.
  const dbs = await asUser.query(api.databases.list, {});
  const db = dbs.find((d) => d._id === dbId);
  expect(db?.rowIds).toContain(rowId);
});

// ── Happy path: setRowValue round-trips through rowProps ──────────────
test("setRowValue updates rowProps and the value reads back", async () => {
  const t = testCtx();
  const { asUser } = await seedUser(t);

  const dbId = await asUser.mutation(api.databases.create, {});
  const rowId = await asUser.mutation(api.databases.addRow, { dbId });

  const dbs = await asUser.query(api.databases.list, {});
  const db = dbs.find((d) => d._id === dbId);
  const propId = db!.properties[0].id as string;

  await asUser.mutation(api.databases.setRowValue, {
    dbId,
    rowPageId: rowId,
    propId,
    value: "Buy milk",
  });

  const row = await asUser.query(api.pages.getById, { id: rowId });
  expect(row?.rowProps?.[propId]).toBe("Buy milk");

  // A second write to a different prop keeps the first value intact.
  await asUser.mutation(api.databases.setRowValue, {
    dbId,
    rowPageId: rowId,
    propId: "note",
    value: 42,
  });
  const row2 = await asUser.query(api.pages.getById, { id: rowId });
  expect(row2?.rowProps?.[propId]).toBe("Buy milk");
  expect(row2?.rowProps?.note).toBe(42);
});

// ── Authz: a non-member second user cannot write rows ─────────────────
test("non-member second user cannot addRow to another user's database", async () => {
  const t = testCtx();
  const { asUser: userA } = await seedUser(t, { email: "a@example.com" });
  const { asUser: userB } = await seedUser(t, { email: "b@example.com" });

  const dbId = await userA.mutation(api.databases.create, {});

  // userB is not a member of userA's (personal) workspace → rejected.
  await expect(
    userB.mutation(api.databases.addRow, { dbId }),
  ).rejects.toThrow();
});

test("non-member second user cannot setRowValue on another user's row", async () => {
  const t = testCtx();
  const { asUser: userA } = await seedUser(t, { email: "a@example.com" });
  const { asUser: userB } = await seedUser(t, { email: "b@example.com" });

  const dbId = await userA.mutation(api.databases.create, {});
  const rowId = await userA.mutation(api.databases.addRow, { dbId });

  await expect(
    userB.mutation(api.databases.setRowValue, {
      dbId,
      rowPageId: rowId,
      propId: "x",
      value: "hax",
    }),
  ).rejects.toThrow();

  // And userA's row is untouched by the failed write.
  const row = await userA.query(api.pages.getById, { id: rowId });
  expect(row?.rowProps?.x).toBeUndefined();
});

// ── Authz: unauthenticated caller is rejected ─────────────────────────
test("create rejects an unauthenticated caller", async () => {
  const t = testCtx();
  await expect(t.mutation(api.databases.create, {})).rejects.toThrow();
});
