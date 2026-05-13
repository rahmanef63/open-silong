import { useEffect } from "react";

/** Scroll-into-view + flash for `#block-<id>` hash navigation. */
export function usePageHashScroll(pageId: string | undefined) {
  useEffect(() => {
    const scroll = () => {
      const m = window.location.hash.match(/^#block-(.+)$/);
      if (!m) return;
      const el = document.querySelector<HTMLElement>(`[data-block-id="${m[1]}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-brand", "rounded-md");
      window.setTimeout(() => el.classList.remove("ring-2", "ring-brand", "rounded-md"), 1600);
    };
    if (window.location.hash) window.setTimeout(scroll, 80);
    window.addEventListener("hashchange", scroll);
    return () => window.removeEventListener("hashchange", scroll);
  }, [pageId]);
}
