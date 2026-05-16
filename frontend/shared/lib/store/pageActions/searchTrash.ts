import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Page } from "@/shared/types/domain";
import { guardMutVoid } from "../mutationGuard";

export function useSearchAndTrash(pages: Page[]) {
  const mutPushRecent = useMutation(api.recents.push);
  const mutUpsertPrefs = useMutation(api.preferences.upsert);

  const pushRecent = useCallback(
    (id: string) => {
      guardMutVoid("pushRecent", mutPushRecent({ pageId: id }));
      guardMutVoid("upsertPrefs", mutUpsertPrefs({ patch: { lastOpenedPageId: id } }));
    },
    [mutPushRecent, mutUpsertPrefs],
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
