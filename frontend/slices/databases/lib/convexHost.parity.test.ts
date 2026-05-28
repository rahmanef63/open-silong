import { describe, expect, it } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { Database, Page } from "@/shared/types/domain";
import { formatFormulaValue, evalFormulaCore } from "./formulaEngine";
import { silongHost, evalFormula as evalSilong } from "./formula";
import { convexHost, evalFormulaConvex } from "./convexHost";

/** 1.G.2 step B — parity gate.
 *
 *  Builds the SAME logical data in two shapes (Silong domain types +
 *  Convex Doc<*>) and asserts that evalFormulaCore returns identical
 *  FormulaValues regardless of which host adapter is plugged in.
 *
 *  If a formula evaluates differently under the two hosts, the
 *  EngineHost interface has a leak — either an implicit field access
 *  the engine still makes on TPage / TDb that the host can't intercept,
 *  or a missing method. Catching that BEFORE npm publish saves a
 *  breaking-version cycle.
 *
 *  Fixtures are deliberately tiny; this is API surface validation, not
 *  exhaustive feature testing (those live in formulaEngine.test.ts). */

// ── Fixture A: Silong shape ─────────────────────────────────────────
const sPeopleDb: Database = {
  id: "people",
  name: "People",
  icon: "👤",
  properties: [
    { id: "email", name: "Email", type: "email" },
    { id: "score", name: "Score", type: "number" },
  ],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0,
  updatedAt: 0,
};
const sAlice: Page = {
  id: "alice",
  parentId: null,
  title: "Alice",
  icon: "👤",
  blocks: [],
  favorite: false,
  trashed: false,
  rowOfDatabaseId: "people",
  rowProps: { email: "alice@x.com", score: 42 },
  createdAt: 0, updatedAt: 0,
};
const sMainDb: Database = {
  id: "main",
  name: "Main",
  icon: "📁",
  properties: [
    { id: "owner", name: "Owner", type: "relation", relationDatabaseId: "people" },
    { id: "title2", name: "Title", type: "text" },
  ],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0, updatedAt: 0,
};
const sTask: Page = {
  id: "task",
  parentId: null,
  title: "Build",
  icon: "🧱",
  blocks: [],
  favorite: false,
  trashed: false,
  rowOfDatabaseId: "main",
  rowProps: { owner: ["alice"] },
  createdAt: 0, updatedAt: 0,
};

// ── Fixture B: Convex shape (same logical data, Doc<*> field names) ──
// Cast string ids → Id<"pages"> / Id<"databases"> at fixture boundary
// (the convex host calls String() on _id, so the underlying string-form
// is what flows through the engine).
const asPageId  = (s: string) => s as unknown as Id<"pages">;
const asDbId    = (s: string) => s as unknown as Id<"databases">;
const asUserId  = (s: string) => s as unknown as Id<"users">;

// Minimal CPage/CDb literals — Doc<> includes _id + _creationTime + every
// schema-required field. We cast through `as unknown as Doc<*>` because
// constructing real Convex Docs requires the runtime, which we don't have
// in vitest. This is a TEST-only fixture; production paths never build
// Docs manually.
const cPeopleDb = {
  _id: asDbId("people"),
  _creationTime: 0,
  userId: asUserId("u"),
  name: "People",
  icon: "👤",
  properties: [
    { id: "email", name: "Email", type: "email" },
    { id: "score", name: "Score", type: "number" },
  ],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0,
  updatedAt: 0,
} as unknown as Doc<"databases">;
const cAlice = {
  _id: asPageId("alice"),
  _creationTime: 0,
  userId: asUserId("u"),
  parentId: null,
  title: "Alice",
  icon: "👤",
  cover: null,
  blocks: [],
  favorite: false,
  trashed: false,
  rowOfDatabaseId: asDbId("people"),
  rowProps: { email: "alice@x.com", score: 42 },
  createdAt: 0,
  updatedAt: 0,
} as unknown as Doc<"pages">;
const cMainDb = {
  _id: asDbId("main"),
  _creationTime: 0,
  userId: asUserId("u"),
  name: "Main",
  icon: "📁",
  properties: [
    { id: "owner", name: "Owner", type: "relation", relationDatabaseId: "people" },
    { id: "title2", name: "Title", type: "text" },
  ],
  rowIds: [],
  views: [],
  activeViewId: "",
  createdAt: 0,
  updatedAt: 0,
} as unknown as Doc<"databases">;
const cTask = {
  _id: asPageId("task"),
  _creationTime: 0,
  userId: asUserId("u"),
  parentId: null,
  title: "Build",
  icon: "🧱",
  cover: null,
  blocks: [],
  favorite: false,
  trashed: false,
  rowOfDatabaseId: asDbId("main"),
  rowProps: { owner: ["alice"] },
  createdAt: 0,
  updatedAt: 0,
} as unknown as Doc<"pages">;

// ── Helpers — run the same source under each host ──────────────────
const silong = (src: string) => formatFormulaValue(evalSilong(src, {
  row: sTask, db: sMainDb, pages: [sAlice, sTask], databases: [sPeopleDb, sMainDb],
}).value);

const convex = (src: string) => formatFormulaValue(evalFormulaConvex(src, {
  row: cTask, db: cMainDb, pages: [cAlice, cTask], databases: [cPeopleDb, cMainDb],
}).value);

// ── Parity assertions ──────────────────────────────────────────────
describe("convexHost — parity vs silongHost (1.G.2 step B)", () => {
  it("identity for plain title ref", () => {
    expect(convex("={{title}}")).toBe(silong("={{title}}"));
    expect(convex("={{title}}")).toBe("Build");
  });

  it("identity for arithmetic", () => {
    expect(convex("=1 + 2 * 3")).toBe(silong("=1 + 2 * 3"));
    expect(convex("=1 + 2 * 3")).toBe("7");
  });

  it("identity for comparison + logical", () => {
    expect(convex("=true && (5 > 3)")).toBe(silong("=true && (5 > 3)"));
    expect(convex("=true && (5 > 3)")).toBe("true");
  });

  it("identity for prop() ref into Silong/Convex Title (built-in)", () => {
    // title is engine-resolved via host.getRowTitle — should match across hosts
    expect(convex(`=prop("title")`)).toBe(silong(`=prop("title")`));
    expect(convex(`=prop("title")`)).toBe("Build");
  });

  it("identity for relation drilldown — `.title`", () => {
    expect(convex(`=prop("Owner").title`)).toBe(silong(`=prop("Owner").title`));
    expect(convex(`=prop("Owner").title`)).toBe("Alice");
  });

  it("identity for cross-db member access — `.Email`", () => {
    expect(convex(`=prop("Owner").Email`)).toBe(silong(`=prop("Owner").Email`));
    expect(convex(`=prop("Owner").Email`)).toBe("alice@x.com");
  });

  it("identity for higher-order over relation drilldown", () => {
    // Silong + Convex both materialize relations as list-of-page entities
    expect(convex(`=map(prop("Owner"), current.Score + 1)`)).toBe(silong(`=map(prop("Owner"), current.Score + 1)`));
    expect(convex(`=map(prop("Owner"), current.Score + 1)`)).toBe("43");
  });

  it("identity for built-in fn library — string + number", () => {
    expect(convex(`=upper(concat("hi ", {{title}}))`)).toBe(silong(`=upper(concat("hi ", {{title}}))`));
    expect(convex(`=round(3.7)`)).toBe(silong(`=round(3.7)`));
  });

  it("identity for if() — control flow", () => {
    expect(convex(`=if({{title}} == "Build", "match", "no")`)).toBe(silong(`=if({{title}} == "Build", "match", "no")`));
    expect(convex(`=if({{title}} == "Build", "match", "no")`)).toBe("match");
  });

  it("identity for error path — unknown function returns same error message", () => {
    const sErr = evalSilong(`=bogus(1)`, { row: sTask, db: sMainDb, pages: [sAlice, sTask] }).error;
    const cErr = evalFormulaConvex(`=bogus(1)`, { row: cTask, db: cMainDb, pages: [cAlice, cTask] }).error;
    expect(sErr?.message).toBe(cErr?.message);
    expect(sErr?.message).toMatch(/unknown function/i);
  });
});

describe("convexHost — uses real Convex types (compile-time check)", () => {
  it("convexHost type matches EngineHost<_, _, Doc<'pages'>, Doc<'databases'>>", () => {
    // No runtime check — TypeScript compilation success at convexHost.ts
    // proves the host satisfies the EngineHost interface with Doc types.
    // This test exists to surface the verified shape in the test report.
    expect(typeof convexHost.getRowId).toBe("function");
    expect(typeof convexHost.resolvePropertyValue).toBe("function");
  });
});

// Avoid unused-import lint — silongHost imported here for side-effect of
// surfacing both module's API in this file's transitive imports (proves
// they can co-exist without symbol collisions).
void silongHost;
void evalFormulaCore;
