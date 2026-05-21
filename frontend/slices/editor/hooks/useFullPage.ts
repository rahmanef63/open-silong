"use client";

import type { Page } from "@/shared/types/domain";
import { useNotionAdapter } from "@/slices/notion";

/** Subscribe to a single full page (with `blocks`). The store's pages
 *  array carries only meta (no blocks) — this hook is the editor's
 *  source of truth for the page being viewed. Re-broadcasts only when
 *  this page changes; unrelated page edits no longer cause a render
 *  here.
 *
 *  Thin wrapper over `adapter.pages.useOne` — preserved as a stable
 *  hook name so existing editor surfaces don't need to learn the
 *  adapter API. The adapter handles the doc → Page normalisation. */
export function useFullPage(id: string | null | undefined): Page | null | undefined {
  return useNotionAdapter().pages.useOne(id);
}
