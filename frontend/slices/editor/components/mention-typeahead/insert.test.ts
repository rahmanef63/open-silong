import { describe, it, expect, afterEach } from "vitest";
import { decorateInPlace } from "../../lib/inlineDecorator";
import { setCaretAtOffset } from "../../lib/inline-decorator/caret";
import { insertMention, type State } from "./insert";
import { liveTriggerRange } from "./dom";

function mkHost(source: string, caretAt: number): HTMLElement {
  const host = document.createElement("div");
  host.contentEditable = "true";
  document.body.appendChild(host);
  decorateInPlace(host, source);
  setCaretAtOffset(host, caretAt);
  return host;
}

describe("multi-mention insert", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  it("liveTriggerRange spans exactly @query typed after an existing chip", () => {
    const src = "[Page One](/dashboard/p/id0001) @foo";
    const host = mkHost(src, src.length);
    const r = liveTriggerRange(host, 4); // "@foo" = 4 chars
    expect(r).not.toBeNull();
    expect(r!.toString()).toBe("@foo");
  });

  it("inserting a 2nd mention does not corrupt the 1st", () => {
    const src = "[Page One](/dashboard/p/id0001) @foo";
    const host = mkHost(src, src.length);
    const state: State = { ce: host, range: document.createRange(), query: "foo", pos: { x: 0, y: 0 } };
    insertMention(state, { id: "id0002", title: "Page Two", kind: "page" });
    expect(host.textContent).toBe(
      "[Page One](/dashboard/p/id0001) [Page Two](/dashboard/p/id0002) ",
    );
  });

  it("inserting a database mention after a page mention stays clean", () => {
    const src = "[Page One](/dashboard/p/id0001) @db";
    const host = mkHost(src, src.length);
    const state: State = { ce: host, range: document.createRange(), query: "db", pos: { x: 0, y: 0 } };
    insertMention(state, { id: "db0002", title: "My DB", kind: "db" });
    expect(host.textContent).toBe(
      "[Page One](/dashboard/p/id0001) [My DB](/dashboard/db/db0002) ",
    );
  });
});
