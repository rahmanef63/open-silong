import { describe, expect, it } from "vitest";
import { decorateLineToFragment } from "./decorate";

function render(line: string, opts?: { hideMarkers?: boolean }): HTMLElement {
  const host = document.createElement("div");
  host.appendChild(decorateLineToFragment(line, opts));
  return host;
}
const markerTexts = (host: HTMLElement) =>
  Array.from(host.querySelectorAll('[data-md-marker="1"]')).map((m) => m.textContent);

describe("decorateLineToFragment", () => {
  it("returns an empty fragment for an empty line", () => {
    expect(decorateLineToFragment("").childNodes.length).toBe(0);
  });

  it("renders plain text as a single text node with no markers", () => {
    const host = render("just text");
    expect(host.textContent).toBe("just text");
    expect(markerTexts(host)).toHaveLength(0);
  });

  it("bold → <strong> wrapped in ** markers", () => {
    const host = render("**bold**");
    expect(host.querySelector("strong")?.textContent).toBe("bold");
    expect(markerTexts(host)).toEqual(["**", "**"]);
    expect(host.textContent).toBe("**bold**");
  });

  it("italic → <em> wrapped in _ markers", () => {
    const host = render("_it_");
    expect(host.querySelector("em")?.textContent).toBe("it");
    expect(host.textContent).toBe("_it_");
  });

  it("strike → <del> wrapped in ~~ markers", () => {
    const host = render("~~no~~");
    expect(host.querySelector("del")?.textContent).toBe("no");
    expect(host.textContent).toBe("~~no~~");
  });

  it("code → <code> wrapped in ` markers", () => {
    const host = render("`x=1`");
    expect(host.querySelector("code")?.textContent).toBe("x=1");
    expect(host.textContent).toBe("`x=1`");
  });

  it("math → span wrapped in $ markers", () => {
    const host = render("$a+b$");
    expect(markerTexts(host)).toEqual(["$", "$"]);
    expect(host.textContent).toBe("$a+b$");
  });

  it("link → label span carrying data-href, bracket markers, exact round-trip", () => {
    const host = render("[home](/docs)");
    const label = host.querySelector("[data-href]");
    expect(label?.textContent).toBe("home");
    expect(label?.getAttribute("data-href")).toBe("/docs");
    expect(markerTexts(host)).toEqual(["[", "](", ")"]);
    expect(host.textContent).toBe("[home](/docs)");
  });

  it("round-trips a mixed line exactly (markers stay in the DOM)", () => {
    const line = "see **bold** and _em_ then `code`";
    expect(render(line).textContent).toBe(line);
  });

  it("hideMarkers keeps markers in the DOM but renders them invisible", () => {
    const host = render("**H**", { hideMarkers: true });
    const markers = host.querySelectorAll('[data-md-marker="1"]');
    expect(markers).toHaveLength(2);
    expect(markers[0].className).toContain("text-transparent");
    expect(host.textContent).toBe("**H**"); // round-trip preserved
  });
});
