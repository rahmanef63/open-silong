import { describe, expect, it } from "vitest";
import { DEFAULT_NOTION_CONFIG, mergeNotionConfig } from "./config";

describe("mergeNotionConfig", () => {
  it("returns the exact defaults object when no override is given", () => {
    expect(mergeNotionConfig()).toBe(DEFAULT_NOTION_CONFIG);
  });

  it("returns a defaults-equal (fresh) object for an empty override", () => {
    const merged = mergeNotionConfig({});
    expect(merged).toEqual(DEFAULT_NOTION_CONFIG);
    expect(merged).not.toBe(DEFAULT_NOTION_CONFIG);
  });

  it("merges a section shallowly, keeping the other keys in that section", () => {
    const merged = mergeNotionConfig({ routes: { basePath: "/app" } });
    expect(merged.routes.basePath).toBe("/app");
    expect(merged.routes.trash).toBe("/dashboard/trash"); // sibling default kept
    // page() is a fixed default fn, NOT derived from basePath — overriding
    // basePath alone must not change it.
    expect(merged.routes.page("abc")).toBe("/dashboard/p/abc");
  });

  it("honors an overridden route function", () => {
    const merged = mergeNotionConfig({ routes: { page: (id) => `/n/${id}` } });
    expect(merged.routes.page("abc")).toBe("/n/abc");
    expect(merged.routes.database("xyz")).toBe("/dashboard/db/xyz"); // default fn kept
  });

  it("flips a single feature flag without touching the rest", () => {
    const merged = mergeNotionConfig({ features: { ai: false } });
    expect(merged.features.ai).toBe(false);
    expect(merged.features.snapshots).toBe(true);
    expect(merged.features.wiki).toBe(true);
  });

  it("overrides individual roles / i18n labels", () => {
    const merged = mergeNotionConfig({
      roles: { owner: "admin" },
      i18n: { untitledPage: "Sin título" },
    });
    expect(merged.roles.owner).toBe("admin");
    expect(merged.roles.editor).toBe("editor"); // default
    expect(merged.i18n.untitledPage).toBe("Sin título");
    expect(merged.i18n.noRowsYet).toBe("No rows yet"); // default
  });

  it("leaves untouched sections fully at their defaults", () => {
    const merged = mergeNotionConfig({ features: { export: false } });
    expect(merged.routes).toEqual(DEFAULT_NOTION_CONFIG.routes);
    expect(merged.roles).toEqual(DEFAULT_NOTION_CONFIG.roles);
    expect(merged.i18n).toEqual(DEFAULT_NOTION_CONFIG.i18n);
  });

  it("does not mutate DEFAULT_NOTION_CONFIG", () => {
    mergeNotionConfig({ roles: { owner: "boss" }, features: { ai: false } });
    expect(DEFAULT_NOTION_CONFIG.roles.owner).toBe("owner");
    expect(DEFAULT_NOTION_CONFIG.features.ai).toBe(true);
  });
});
