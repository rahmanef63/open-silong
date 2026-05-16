import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Page } from "@/shared/types/domain";
import { guardMutVoid } from "../mutationGuard";

export function useSearchAndTrash(pages: Page[]) {
  const mutPushRecent = useMutation(api.recents.push);
  const mutUpsertPrefs = useMutation(api.preferences.upsert);
  const pageIdSet = useMemo(() => new Set(pages.map((p) => p.id)), [pages]);

  const pushRecent = useCallback(
    (id: string) => {
      // Guard: recents.pageIds is `Id<"pages">[]` — silently drop ids
      // that aren't in the user's page set (e.g. database ids from
      // /dashboard/db/:id) so the Convex validator never rejects.
      if (!pageIdSet.has(id)) return;
      guardMutVoid("pushRecent", mutPushRecent({ pageId: id as Id<"pages"> }));
      guardMutVoid("upsertPrefs", mutUpsertPrefs({ patch: { lastOpenedPageId: id } }));
    },
    [pageIdSet, mutPushRecent, mutUpsertPrefs],
  );

  const trash = useMemo(() => pages.filter((p) => p.trashed), [pages]);

  const search = useCallback(
    (q: string) => {
      const s = q.trim().toLowerCase();
      if (!s) return [];
      return pages
        .filter((p) =>
          !p.trashed && (p.title.toLowerCase().includes(s) || p.blocks.some((b) => b.text.toLowerCase().includes(s))),
        )
        .slice(0, 20);
    },
    [pages],
  );

  return { pushRecent, trash, search };
}
