import { describe, expect, it } from "vitest";
import { rankDatabases } from "./databasePickerRank";

const dbs = [
  { id: "a", name: "Tasks", icon: "✅", rowIds: ["1", "2", "3"] },
  { id: "b", name: "Tasks (archive)", icon: "📦", rowIds: [] },
  { id: "c", name: "Notes", icon: "📝", rowIds: ["x"] },
  { id: "d", name: "", icon: "", rowIds: [] },
];

describe("rankDatabases", () => {
  it("returns all entries when query empty", () => {
    const r = rankDatabases(dbs, "");
    expect(r).toHaveLength(4);
  });

  it("ranks exact match highest, prefix next, contains last", () => {
    const r = rankDatabases(dbs, "tasks");
    expect(r[0].id).toBe("a"); // exact
    expect(r[1].id).toBe("b"); // prefix
    expect(r.find((x) => x.id === "c")).toBeUndefined();
  });

  it("breaks score ties by row count descending", () => {
    const r = rankDatabases(dbs, "ta");
    expect(r[0].id).toBe("a");
    expect(r[1].id).toBe("b");
  });

  it("returns empty for non-matching query", () => {
    const r = rankDatabases(dbs, "zzz");
    expect(r).toHaveLength(0);
  });

  it("treats empty name as 'Untitled'", () => {
    const r = rankDatabases(dbs, "untitled");
    expect(r[0].id).toBe("d");
    expect(r[0].name).toBe("Untitled");
  });
});
