import { describe, it, expect } from "vitest";
import { validateTemplate } from "../lib/validate";
import { SEED_TEMPLATES } from "./index";

/** Smoke test the entire seed catalog — every template must pass
 *  validation, otherwise `seedDefaults` would throw in production. */
describe("SEED_TEMPLATES catalog", () => {
  it("contains 8 templates (3 starter + 5 column-heavy dashboards)", () => {
    expect(SEED_TEMPLATES).toHaveLength(8);
  });

  for (const tpl of SEED_TEMPLATES) {
    it(`validates: ${tpl.name}`, () => {
      expect(() => validateTemplate(tpl)).not.toThrow();
    });
  }

  it("every template has a unique name", () => {
    const names = SEED_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each column-heavy template uses columns2 or columns3 at least once", () => {
    const columnHeavy = SEED_TEMPLATES.filter((t) =>
      ["Project OS", "Personal CRM", "Content Calendar", "OKR Tracker", "Recipe Vault"].includes(t.name),
    );
    expect(columnHeavy).toHaveLength(5);
    for (const tpl of columnHeavy) {
      const hasColumns = JSON.stringify(tpl).includes('"columns2"') || JSON.stringify(tpl).includes('"columns3"');
      expect(hasColumns, `${tpl.name} must use columns2/3`).toBe(true);
    }
  });

  it("each column-heavy template ships at least one dashboard view", () => {
    const columnHeavy = SEED_TEMPLATES.filter((t) =>
      ["Project OS", "Personal CRM", "Content Calendar", "OKR Tracker", "Recipe Vault"].includes(t.name),
    );
    for (const tpl of columnHeavy) {
      const hasDashboard = JSON.stringify(tpl).includes('"dashboard"');
      expect(hasDashboard, `${tpl.name} must include a dashboard view`).toBe(true);
    }
  });
});
