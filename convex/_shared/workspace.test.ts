import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { rowInActiveWorkspace, slugifyWorkspaceName } from "./workspace";

const ws = (s: string) => s as Id<"workspaces">;
const usr = (s: string) => s as Id<"users">;

describe("slugifyWorkspaceName", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugifyWorkspaceName("My Workspace")).toBe("my-workspace");
    expect(slugifyWorkspaceName("Project 2026")).toBe("project-2026");
  });

  it("strips diacritics via NFKD", () => {
    expect(slugifyWorkspaceName("Café Münü")).toBe("cafe-munu");
  });

  it("collapses punctuation runs and trims edge hyphens", () => {
    expect(slugifyWorkspaceName("  Hello!!  World!  ")).toBe("hello-world");
    expect(slugifyWorkspaceName("--abc--")).toBe("abc");
  });

  it("falls back to 'workspace' when nothing url-safe survives", () => {
    expect(slugifyWorkspaceName("")).toBe("workspace");
    expect(slugifyWorkspaceName("!!!")).toBe("workspace");
    expect(slugifyWorkspaceName("日本語")).toBe("workspace");
  });

  it("caps the slug at 40 chars", () => {
    expect(slugifyWorkspaceName("a".repeat(60))).toHaveLength(40);
  });
});

describe("rowInActiveWorkspace (workspace-isolation rule)", () => {
  const u = usr("u1");

  it("matches an explicitly-stamped row to the active workspace", () => {
    expect(rowInActiveWorkspace({ workspaceId: ws("A"), userId: u }, { _id: ws("A") }, u)).toBe(true);
    expect(rowInActiveWorkspace({ workspaceId: ws("A"), userId: u }, { _id: ws("B") }, u)).toBe(false);
  });

  it("explicit workspaceId wins — a stamped row never leaks into a different workspace, even the owner's personal one", () => {
    expect(
      rowInActiveWorkspace(
        { workspaceId: ws("A"), userId: u },
        { _id: ws("B"), isPersonal: true, ownerId: u },
        u,
      ),
    ).toBe(false);
  });

  it("a legacy (unstamped) row shows in the owner's personal workspace", () => {
    expect(rowInActiveWorkspace({ userId: u }, { _id: ws("P"), isPersonal: true }, u)).toBe(true);
  });

  it("a legacy row never leaks another user's data, even in a personal workspace", () => {
    expect(
      rowInActiveWorkspace({ userId: usr("other") }, { _id: ws("P"), isPersonal: true }, u),
    ).toBe(false);
  });

  it("a legacy row does not pass through in a non-personal/shared workspace", () => {
    expect(rowInActiveWorkspace({ userId: u }, { _id: ws("S"), isPersonal: false }, u)).toBe(false);
    expect(rowInActiveWorkspace({ userId: u }, { _id: ws("S") }, u)).toBe(false); // isPersonal undefined
  });
});
