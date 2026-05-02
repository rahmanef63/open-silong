import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const FLAG = "search_backfill_v1";

/** Idempotent: trigger a one-shot backfill of `pages.searchText` for the current
 *  user, gated on a localStorage flag so it runs at most once per browser session.
 *  Cheap on subsequent loads (early return). */
export function useSearchBackfill(enabled: boolean) {
  const backfill = useMutation(api["features/search/mutations"].backfillSearchText);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FLAG)) return;
    backfill().then((res) => {
      window.localStorage.setItem(FLAG, JSON.stringify({ at: Date.now(), ...res }));
    }).catch(() => {/* swallow — next mount will retry */});
  }, [enabled, backfill]);
}
