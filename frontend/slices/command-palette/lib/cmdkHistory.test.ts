import { describe, expect, it, beforeEach } from "vitest";
import { HISTORY_KEY, HISTORY_MAX, loadHistory, saveHistory } from "./cmdkHistory";

class FakeStorage implements Storage {
  store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
}

let s: FakeStorage;
beforeEach(() => { s = new FakeStorage(); });

describe("cmdkHistory", () => {
  it("returns empty array when storage is empty", () => {
    expect(loadHistory(s)).toEqual([]);
  });

  it("saves a single entry", () => {
    saveHistory({ id: "action:home", label: "Home" }, s);
    expect(loadHistory(s)).toEqual([{ id: "action:home", label: "Home" }]);
  });

  it("dedupes by id (newest first)", () => {
    saveHistory({ id: "x", label: "X1" }, s);
    saveHistory({ id: "y", label: "Y" }, s);
    saveHistory({ id: "x", label: "X2" }, s);
    expect(loadHistory(s)).toEqual([
      { id: "x", label: "X2" },
      { id: "y", label: "Y" },
    ]);
  });

  it("caps at HISTORY_MAX entries", () => {
    for (let i = 0; i < HISTORY_MAX + 5; i++) {
      saveHistory({ id: `a${i}`, label: `A${i}` }, s);
    }
    const out = loadHistory(s);
    expect(out.length).toBe(HISTORY_MAX);
    // newest first → a9 / a8 / a7 / a6 / a5 (HISTORY_MAX = 5)
    expect(out[0].id).toBe(`a${HISTORY_MAX + 4}`);
  });

  it("ignores corrupt JSON", () => {
    s.setItem(HISTORY_KEY, "{not json");
    expect(loadHistory(s)).toEqual([]);
  });

  it("filters out entries that don't match the shape", () => {
    s.setItem(HISTORY_KEY, JSON.stringify([
      { id: "ok", label: "Ok" },
      { id: 42 },          // bad shape
      "string-row",        // bad shape
      null,
    ]));
    expect(loadHistory(s)).toEqual([{ id: "ok", label: "Ok" }]);
  });
});
