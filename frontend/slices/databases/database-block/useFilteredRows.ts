import { useMemo } from "react";
import type { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";

export function useFilteredRows(rows: Page[], view: DatabaseViewConfig | undefined) {
  return useMemo(() => {
    if (!view) return [];
    let out = rows;
    if (view.search?.trim()) {
      const q = view.search.toLowerCase();
      out = out.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        Object.values(p.rowProps ?? {}).some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
    }
    for (const f of view.filters ?? []) {
      out = out.filter((p) => {
        const v = p.rowProps?.[f.propertyId];
        switch (f.op) {
          case "contains":
            return String(v ?? "").toLowerCase().includes((f.value ?? "").toLowerCase());
          case "equals":
            return String(v ?? "") === (f.value ?? "");
          case "not_empty":
            return v !== undefined && v !== null && v !== "";
          case "is_empty":
            return v === undefined || v === null || v === "";
          case "checked":
            return v === true;
          case "unchecked":
            return v !== true;
        }
      });
    }
    if ((view.sorts ?? []).length) {
      out = [...out].sort((a, b) => {
        for (const s of view.sorts!) {
          const av = a.rowProps?.[s.propertyId];
          const bv = b.rowProps?.[s.propertyId];
          const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }
    return out;
  }, [rows, view]);
}

export function useDatabaseRows(database: Database | undefined, allPages: Page[]) {
  return useMemo(() => {
    if (!database) return [] as Page[];
    const map = new Map(allPages.map((p) => [p.id, p]));
    return database.rowIds.map((id) => map.get(id)).filter((p): p is Page => !!p && !p.trashed);
  }, [database, allPages]);
}

export function useIsLinked(database: Database | undefined, allPages: Page[], isInline: boolean) {
  return useMemo(() => {
    if (!isInline || !database) return false;
    let hosts = 0;
    for (const p of allPages) {
      if (p.trashed) continue;
      const blocks = p.blocks ?? [];
      for (const b of blocks) {
        if (b.type === "database" && b.databaseId === database.id) {
          hosts++;
          if (hosts > 1) return true;
        }
      }
    }
    return false;
  }, [database, allPages, isInline]);
}
