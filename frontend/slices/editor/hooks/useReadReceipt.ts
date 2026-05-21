import { useEffect, useRef } from "react";
import { useNotionAdapter } from "@/slices/notion";

const TOUCH_INTERVAL_MS = 30_000;

/** Touch the pageViews receipt for the current page on mount + every
 *  30s while the document is visible. No-op when pageId is empty or
 *  the host adapter doesn't provide a presence capability. */
export function useReadReceipt(pageId: string | null | undefined) {
  const adapter = useNotionAdapter();
  const touch = adapter.presence?.touch;
  const lastTouchedAt = useRef(0);

  useEffect(() => {
    if (!pageId || !touch) return;
    const fire = () => {
      const now = Date.now();
      if (now - lastTouchedAt.current < TOUCH_INTERVAL_MS - 1_000) return;
      if (typeof document !== "undefined" && document.hidden) return;
      lastTouchedAt.current = now;
      void touch(pageId).catch(() => {});
    };
    fire();
    const t = setInterval(fire, TOUCH_INTERVAL_MS);
    const onVis = () => { if (!document.hidden) fire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pageId, touch]);
}
