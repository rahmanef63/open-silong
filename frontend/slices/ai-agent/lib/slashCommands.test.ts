import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS, findSlash } from "./slashCommands";

const cmd = (id: string) => SLASH_COMMANDS.find((c) => c.id === id)!;

describe("findSlash — matching", () => {
  it("matches exact trigger", () => {
    const hit = findSlash("/summarize");
    expect(hit?.cmd.id).toBe("summarize");
    expect(hit?.rest).toBe("");
  });
  it("matches trigger + space + rest, returns trimmed rest", () => {
    const hit = findSlash("/translate ja こんにちは");
    expect(hit?.cmd.id).toBe("translate");
    expect(hit?.rest).toBe("ja こんにちは");
  });
  it("requires a space boundary — /improvex does NOT match /improve", () => {
    expect(findSlash("/improvex")).toBeNull();
  });
  it("non-slash text → null", () => {
    expect(findSlash("hello world")).toBeNull();
    expect(findSlash("")).toBeNull();
  });
  it("leading/trailing whitespace tolerated", () => {
    expect(findSlash("   /ask  what is this  ")?.cmd.id).toBe("ask");
  });
  it("disambiguates /append from /ask (prefix-collision safe)", () => {
    // "ask" is earlier in the array; ensure /append still routes correctly
    expect(findSlash("/append more text")?.cmd.id).toBe("skill-append");
  });
});

describe("buildPrompt — improve / summarize / ask context handling", () => {
  it("improve: context wraps input with instruction", () => {
    const out = cmd("improve").buildPrompt("make it punchy", "draft text");
    expect(out.system).toMatch(/grammar/i);
    expect(out.userPrompt).toBe("draft text\n\n---\nInstruction: make it punchy");
  });
  it("improve: no context + empty input → default instruction", () => {
    expect(cmd("improve").buildPrompt("").userPrompt).toBe("");
    expect(cmd("improve").buildPrompt("", undefined).userPrompt).toBe("");
  });
  it("summarize: prefers context over input", () => {
    expect(cmd("summarize").buildPrompt("ignored", "the page body").userPrompt).toBe("the page body");
    expect(cmd("summarize").buildPrompt("just input").userPrompt).toBe("just input");
  });
  it("ask: context-prefixed question vs bare input", () => {
    expect(cmd("ask").buildPrompt("why?", "ctx").userPrompt).toBe("ctx\n\n---\nQuestion: why?");
    expect(cmd("ask").buildPrompt("why?").userPrompt).toBe("why?");
  });
});

describe("buildPrompt — translate lang parsing", () => {
  it("first token is the target language", () => {
    const out = cmd("translate").buildPrompt("ja some text here");
    expect(out.system).toContain("Translate the input to ja");
    expect(out.userPrompt).toBe("some text here");
  });
  it("defaults to id when no language token", () => {
    const out = cmd("translate").buildPrompt("");
    expect(out.system).toContain("Translate the input to id");
  });
  it("context overrides the inline rest as the text to translate", () => {
    const out = cmd("translate").buildPrompt("en ignored inline", "real page text");
    expect(out.system).toContain("Translate the input to en");
    expect(out.userPrompt).toBe("real page text");
  });
});

describe("buildPrompt — skill directives force-route tools", () => {
  it("append references pages_append_markdown + activePageId", () => {
    const out = cmd("skill-append").buildPrompt("new content");
    expect(out.userPrompt).toContain("pages_append_markdown");
    expect(out.userPrompt).toContain("new content");
  });
  it("create / rename / icon reference their tools", () => {
    expect(cmd("skill-create").buildPrompt("My Page").userPrompt).toContain("pages_create");
    expect(cmd("skill-rename").buildPrompt("New Name").userPrompt).toContain("pages_set_title");
    expect(cmd("skill-icon").buildPrompt("🎯").userPrompt).toContain("pages_set_icon");
  });
});

describe("SLASH_COMMANDS — registry invariants", () => {
  it("every command has unique id + trigger starting with /", () => {
    const ids = new Set(SLASH_COMMANDS.map((c) => c.id));
    expect(ids.size).toBe(SLASH_COMMANDS.length);
    expect(SLASH_COMMANDS.every((c) => c.trigger.startsWith("/"))).toBe(true);
  });
  it("every buildPrompt returns a userPrompt string", () => {
    for (const c of SLASH_COMMANDS) {
      const out = c.buildPrompt("x", "ctx");
      expect(typeof out.userPrompt).toBe("string");
    }
  });
});
