import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../hooks/useAIChat";
import { SessionStore, deriveTitle } from "./sessions";

// Matches STORAGE_KEY in sessions.ts (intentional storage contract).
const KEY = "nosion.ai.sessions.v1";

beforeEach(() => localStorage.clear());

describe("deriveTitle", () => {
  it("strips a leading slash-command", () => {
    expect(deriveTitle("/ask hello world")).toBe("hello world");
    expect(deriveTitle("/cmd    spaced")).toBe("spaced");
  });

  it("falls back to 'New chat' when empty after stripping", () => {
    expect(deriveTitle("/ask")).toBe("New chat");
    expect(deriveTitle("   ")).toBe("New chat");
  });

  it("uses only the first line", () => {
    expect(deriveTitle("first line\nsecond line")).toBe("first line");
  });

  it("truncates with an ellipsis past 60 chars", () => {
    const out = deriveTitle("a".repeat(70));
    expect(out).toHaveLength(60);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves plain short text untouched", () => {
    expect(deriveTitle("Quick note")).toBe("Quick note");
  });
});

describe("SessionStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });
  afterEach(() => vi.useRealTimers());

  it("creates, persists, and reads back a session", () => {
    const s = SessionStore.create({ id: "a", agentId: "writer" });
    expect(s.title).toBe("New chat");
    expect(s.messages).toEqual([]);
    expect(s.createdAt).toBe(s.updatedAt);
    expect(SessionStore.get("a")?.agentId).toBe("writer");
  });

  it("returns undefined for a missing id", () => {
    expect(SessionStore.get("nope")).toBeUndefined();
  });

  it("lists most-recently-updated first", () => {
    SessionStore.create({ id: "old", agentId: "x" });
    vi.setSystemTime(5000);
    SessionStore.create({ id: "new", agentId: "x" });
    expect(SessionStore.list().map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("update patches fields and bumps updatedAt; no-op for a missing id", () => {
    SessionStore.create({ id: "a", agentId: "x" });
    vi.setSystemTime(9000);
    SessionStore.update("a", { agentId: "y" });
    const s = SessionStore.get("a")!;
    expect(s.agentId).toBe("y");
    expect(s.updatedAt).toBe(9000);

    expect(() => SessionStore.update("ghost", { agentId: "z" })).not.toThrow();
    expect(SessionStore.get("ghost")).toBeUndefined();
  });

  it("rename truncates to 60 chars (no ellipsis)", () => {
    SessionStore.create({ id: "a", agentId: "x" });
    SessionStore.rename("a", "z".repeat(70));
    expect(SessionStore.get("a")?.title).toHaveLength(60);
  });

  it("setMessages / setAgent / delete", () => {
    SessionStore.create({ id: "a", agentId: "x" });
    SessionStore.setMessages("a", [{} as ChatMessage, {} as ChatMessage]);
    expect(SessionStore.get("a")?.messages).toHaveLength(2);
    SessionStore.setAgent("a", "coder");
    expect(SessionStore.get("a")?.agentId).toBe("coder");
    SessionStore.delete("a");
    expect(SessionStore.get("a")).toBeUndefined();
  });

  it("caps stored sessions at 50, dropping the oldest", () => {
    for (let i = 0; i < 51; i++) {
      vi.setSystemTime(1000 + i * 1000);
      SessionStore.create({ id: `s${i}`, agentId: "x" });
    }
    const list = SessionStore.list();
    expect(list).toHaveLength(50);
    expect(SessionStore.get("s0")).toBeUndefined(); // oldest evicted
    expect(SessionStore.get("s50")).toBeDefined();
  });

  it("list() tolerates corrupt / malformed storage", () => {
    localStorage.setItem(KEY, "not json");
    expect(SessionStore.list()).toEqual([]);

    localStorage.setItem(KEY, JSON.stringify({ not: "an array" }));
    expect(SessionStore.list()).toEqual([]);

    localStorage.setItem(KEY, JSON.stringify([
      { id: "ok", messages: [], createdAt: 1, updatedAt: 1, title: "t", agentId: "a" },
      { id: "missing-messages" },
      { messages: [] }, // no id
      null,
    ]));
    const out = SessionStore.list();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("ok");
  });
});
