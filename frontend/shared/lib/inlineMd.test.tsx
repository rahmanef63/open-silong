import { describe, expect, it } from "vitest";
import { stripMd, tokenizeInline } from "./inlineMd";

describe("tokenizeInline", () => {
  it("returns empty for empty input", () => {
    expect(tokenizeInline("")).toEqual([]);
  });

  it("plain text passes through", () => {
    expect(tokenizeInline("hello world")).toEqual([{ kind: "text", value: "hello world" }]);
  });

  it("bold marker", () => {
    expect(tokenizeInline("**hi**")).toEqual([{ kind: "bold", inner: "hi" }]);
  });

  it("italic with asterisk and underscore", () => {
    expect(tokenizeInline("*a*")).toEqual([{ kind: "italic", inner: "a" }]);
    expect(tokenizeInline("_b_")).toEqual([{ kind: "italic", inner: "b" }]);
  });

  it("strike marker", () => {
    expect(tokenizeInline("~~bye~~")).toEqual([{ kind: "strike", inner: "bye" }]);
  });

  it("inline code wins over bold inside", () => {
    expect(tokenizeInline("`**not bold**`")).toEqual([{ kind: "code", inner: "**not bold**" }]);
  });

  it("markdown link", () => {
    expect(tokenizeInline("[a](https://x.io)")).toEqual([
      { kind: "link", label: "a", href: "https://x.io" },
    ]);
  });

  it("bare url becomes link", () => {
    expect(tokenizeInline("see https://x.io now")).toEqual([
      { kind: "text", value: "see " },
      { kind: "link", label: "https://x.io", href: "https://x.io" },
      { kind: "text", value: " now" },
    ]);
  });

  it("mixed line", () => {
    expect(tokenizeInline("a **b** c")).toEqual([
      { kind: "text", value: "a " },
      { kind: "bold", inner: "b" },
      { kind: "text", value: " c" },
    ]);
  });

  it("does not match unclosed markers", () => {
    expect(tokenizeInline("**unclosed")).toEqual([{ kind: "text", value: "**unclosed" }]);
  });

  it("rejects markers spanning newlines", () => {
    expect(tokenizeInline("**a\nb**")).toEqual([{ kind: "text", value: "**a\nb**" }]);
  });

  it("accepts relative dashboard links", () => {
    expect(tokenizeInline("[Page](/dashboard/p/abc)")).toEqual([
      { kind: "link", label: "Page", href: "/dashboard/p/abc" },
    ]);
  });

  it("rejects javascript: scheme links", () => {
    expect(tokenizeInline("[x](javascript:alert(1))")).toEqual([
      { kind: "text", value: "[x](javascript:alert(1))" },
    ]);
  });

  it("tokenizes inline math", () => {
    expect(tokenizeInline("e=$mc^2$")).toEqual([
      { kind: "text", value: "e=" },
      { kind: "math", inner: "mc^2" },
    ]);
  });

  it("does not match cross-newline math", () => {
    expect(tokenizeInline("$a\nb$")).toEqual([{ kind: "text", value: "$a\nb$" }]);
  });

  it("wikilink [[Title]]", () => {
    expect(tokenizeInline("[[Home]]")).toEqual([
      { kind: "wikilink", title: "Home", alias: undefined },
    ]);
  });

  it("wikilink with alias [[Title|alias]]", () => {
    expect(tokenizeInline("[[Home Page|home]]")).toEqual([
      { kind: "wikilink", title: "Home Page", alias: "home" },
    ]);
  });

  it("wikilink amid text, exact source round-trips", () => {
    const tokens = tokenizeInline("see [[Notes]] now");
    expect(tokens).toEqual([
      { kind: "text", value: "see " },
      { kind: "wikilink", title: "Notes", alias: undefined },
      { kind: "text", value: " now" },
    ]);
  });

  it("preserves raw (untrimmed) wikilink title for caret parity", () => {
    // The decorator reconstructs `[[` + title + `]]`; trimming here would
    // drop the inner spaces and drift innerText from the stored source.
    expect(tokenizeInline("[[ spaced ]]")).toEqual([
      { kind: "wikilink", title: " spaced ", alias: undefined },
    ]);
  });

  it("tag #tag", () => {
    expect(tokenizeInline("#todo")).toEqual([{ kind: "tag", tag: "todo" }]);
  });

  it("nested tag #a/b keeps the full path", () => {
    expect(tokenizeInline("#area/work")).toEqual([{ kind: "tag", tag: "area/work" }]);
  });

  it("tag mid-line keeps the leading space in its own text run", () => {
    expect(tokenizeInline("foo #bar")).toEqual([
      { kind: "text", value: "foo " },
      { kind: "tag", tag: "bar" },
    ]);
  });

  it("does NOT tokenize a heading marker `# ` as a tag (h1 collision guard)", () => {
    expect(tokenizeInline("# ")).toEqual([{ kind: "text", value: "# " }]);
    expect(tokenizeInline("## heading")).toEqual([{ kind: "text", value: "## heading" }]);
  });

  it("does NOT tokenize `#` glued to a non-boundary word char", () => {
    // TAG_RE requires start-of-string or whitespace before `#`.
    expect(tokenizeInline("a#b")).toEqual([{ kind: "text", value: "a#b" }]);
  });
});

describe("stripMd", () => {
  it("strips bold markers", () => {
    expect(stripMd("**hi**")).toBe("hi");
  });
  it("strips italic markers (_…_)", () => {
    expect(stripMd("_hi_")).toBe("hi");
  });
  it("strips strike markers", () => {
    expect(stripMd("~~bye~~")).toBe("bye");
  });
  it("strips inline code", () => {
    expect(stripMd("`code`")).toBe("code");
  });
  it("strips link, keeps label", () => {
    expect(stripMd("[Page](/dashboard/p/abc)")).toBe("Page");
    expect(stripMd("[ext](https://x.io)")).toBe("ext");
  });
  it("preserves plain text", () => {
    expect(stripMd("hello world")).toBe("hello world");
  });
  it("strips multiple markers in one string", () => {
    expect(stripMd("**bold** and _it_ with `code`")).toBe("bold and it with code");
  });
});
