import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { SearchResult } from "../types";

const EMPTY: SearchResult = { pages: [], databases: [] };

/** Live full-text search across pages.title + databases.name (Convex search index). */
export function useSearch(query: string, limit = 20) {
  const trimmed = query.trim();
  // Convex skips fetching when first arg is "skip" via undefined check pattern
  const data = useQuery(
    api["features/search/queries"].search,
    trimmed ? { q: trimmed, limit } : "skip",
  );

  return useMemo(() => ({
    isLoading: trimmed.length > 0 && data === undefined,
    result: (data ?? EMPTY) as SearchResult,
  }), [data, trimmed]);
}
