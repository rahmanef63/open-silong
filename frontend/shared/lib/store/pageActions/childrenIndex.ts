import { useCallback, useMemo } from "react";
import type { Page, Preferences } from "@/shared/types/domain";

export function useChildrenIndex(pages: Page[], preferences: Preferences) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    for (const p of pages) {
      if (p.trashed || p.rowOfDatabaseId) continue;
      const arr = map.get(p.parentId) ?? [];
      arr.push(p);
      map.set(p.parentId, arr);
    }
    const cmp = (a: Page, b: Page) => {
      switch (preferences.defaultPageSort) {
        case "title":   return a.title.localeCompare(b.title);
        case "updated": return b.updatedAt - a.updatedAt;
        case "created": return a.createdAt - b.createdAt;
        default:        return a.createdAt - b.createdAt;
      }
    };
    for (const arr of map.values()) arr.sort(cmp);
    return map;
  }, [pages, preferences.defaultPageSort]);

  const EMPTY: Page[] = useMemo(() => [], []);
  const childrenOf = useCallback(
    (parentId: string | null) => childrenByParent.get(parentId) ?? EMPTY,
    [childrenByParent, EMPTY],
  );

  return { childrenByParent, childrenOf };
}
