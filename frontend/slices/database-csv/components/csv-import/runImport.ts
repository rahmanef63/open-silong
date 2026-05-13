import type { Database, Page, Property, PropertyType, SelectOption } from "@/shared/types/domain";
import { valueFromString, type ParsedCsv } from "../../lib/csv";
import { NEW_PREFIX, OPTION_COLORS, SKIP, TITLE, uid } from "./constants";

interface StoreOps {
  addRow: (dbId: string) => Promise<{ id: string }>;
  setRowValue: (dbId: string, rowId: string, propId: string, value: any) => Promise<unknown> | unknown;
  updatePage: (id: string, patch: Partial<Page>) => Promise<unknown> | unknown;
  updateDatabase: (id: string, patch: Partial<Database>) => Promise<unknown> | unknown;
  pages: Page[];
}

function collectNewOptionNames(parsed: ParsedCsv, colIdx: number, type: PropertyType): string[] {
  if (type !== "select" && type !== "multi_select" && type !== "status") return [];
  const seen = new Map<string, string>();
  const add = (n: string) => {
    const lc = n.toLowerCase();
    if (!seen.has(lc)) seen.set(lc, n);
  };
  for (const row of parsed.rows) {
    const raw = (row[colIdx] ?? "").trim();
    if (!raw) continue;
    if (type === "multi_select") {
      raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach(add);
    } else {
      add(raw);
    }
  }
  return [...seen.values()];
}

export async function runCsvImport(
  parsed: ParsedCsv,
  mapping: Record<number, string>,
  db: Database,
  ops: StoreOps,
): Promise<number> {
  // 1) Build all "+ Create new" properties LOCALLY, then commit them
  //    in a single updateDatabase call. Calling addProperty in a loop
  //    races on the React-state baseline (each call sees the same
  //    stale db.properties → last write wins → only one prop survives).
  const resolved: Record<number, string> = { ...mapping };
  const createdProps = new Map<string, Property>();
  const newProps: Property[] = [];
  for (let i = 0; i < parsed.headers.length; i++) {
    const target = resolved[i];
    if (!target?.startsWith(NEW_PREFIX)) continue;
    const type = target.slice(NEW_PREFIX.length) as PropertyType;
    const name = parsed.headers[i] || `Column ${i + 1}`;
    const propId = uid();

    let options: SelectOption[] | undefined;
    if (type === "select" || type === "multi_select" || type === "status") {
      const optionNames = collectNewOptionNames(parsed, i, type);
      options = optionNames.map((n, idx) => ({
        id: `${propId}_opt_${idx}`,
        name: n,
        color: OPTION_COLORS[idx % OPTION_COLORS.length],
      }));
    }

    const prop: Property = { id: propId, name, type, options };
    newProps.push(prop);
    createdProps.set(propId, prop);
    resolved[i] = propId;
  }

  if (newProps.length > 0) {
    await ops.updateDatabase(db.id, { properties: [...db.properties, ...newProps] });
  }

  const propLookup = (id: string) =>
    db.properties.find((p) => p.id === id) ?? createdProps.get(id);

  let count = 0;
  for (const row of parsed.rows) {
    if (row.every((c) => c.trim() === "")) continue;
    const newRow = await ops.addRow(db.id);
    let title = "";
    for (let i = 0; i < parsed.headers.length; i++) {
      const target = resolved[i];
      if (!target || target === SKIP) continue;
      const raw = row[i] ?? "";
      if (target === TITLE) { title = raw.trim(); continue; }
      const prop = propLookup(target);
      if (!prop) continue;
      const value = valueFromString(raw, prop, { pages: ops.pages });
      if (value === null) continue;
      await ops.setRowValue(db.id, newRow.id, prop.id, value);
    }
    if (title) await ops.updatePage(newRow.id, { title });
    count++;
  }
  return count;
}
