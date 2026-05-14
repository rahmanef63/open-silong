import { describe, it, expect } from "vitest";
import { validateTemplate } from "../lib/validate";
import { SEED_TEMPLATES } from "./index";

/** Smoke test the entire seed catalog — every template must pass
 *  validation, otherwise `seedDefaults` would throw in production. */
describe("SEED_TEMPLATES catalog", () => {
  it("contains 25 templates", () => {
    expect(SEED_TEMPLATES).toHaveLength(25);
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

  it("every template has at least one database", () => {
    for (const tpl of SEED_TEMPLATES) {
      const hasDb = (tpl.page.databases?.length ?? 0) > 0;
      expect(hasDb, `${tpl.name} must declare at least one database`).toBe(true);
    }
  });

  it("relation properties resolve to a sibling database", () => {
    for (const tpl of SEED_TEMPLATES) {
      const refs = new Set((tpl.page.databases ?? []).map((d) => d.ref));
      for (const db of tpl.page.databases ?? []) {
        for (const p of db.properties) {
          if (p.type === "relation" && p.relationDatabaseRef) {
            expect(refs.has(p.relationDatabaseRef), `${tpl.name}.${db.ref}.${p.id} → unknown ref ${p.relationDatabaseRef}`).toBe(true);
          }
        }
      }
    }
  });

  it("column-heavy templates use columns2/3/4/5 + ship a dashboard view", () => {
    const columnHeavy = SEED_TEMPLATES.filter((t) =>
      [
        "Project OS", "Personal CRM", "Content Calendar", "OKR Tracker", "Recipe Vault",
        "Sprint Planner", "Bug Tracker", "Product Roadmap", "Trip Planner",
        "Monthly Budget", "Investment Portfolio", "Course Tracker", "Home Inventory",
        "Workout Log", "Sales Pipeline", "Daily Journal", "Meeting Notes",
        "Subscription Tracker", "Job Search", "Wedding Planner",
        "Garage / Workshop", "Podcast Library",
      ].includes(t.name),
    );
    for (const tpl of columnHeavy) {
      const json = JSON.stringify(tpl);
      const hasColumns = /"columns[2-5]"/.test(json);
      expect(hasColumns, `${tpl.name} must use columns*`).toBe(true);
    }
  });
});
