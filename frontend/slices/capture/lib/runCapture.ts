import type { CaptureInput, CapturePrefs } from "../types";
import { resolveCaptureTarget } from "./captureInput";

/** Side effects the capture runner needs, injected so the orchestration
 *  is pure + unit-testable (no store / router / parser coupling here). */
export interface CaptureRunnerDeps {
  prefs?: CapturePrefs;
  /** Create a page under `parentId` (null = top-level); returns its id. */
  createPage: (parentId: string | null, opts?: { title?: string }) => Promise<{ id: string }>;
  /** Persist the parsed body blocks onto the new page. */
  setBlocks: (pageId: string, blocks: unknown[]) => void | Promise<void>;
  /** markdown body → block array (the existing markdownToBlocks). */
  toBlocks: (markdown: string) => unknown[];
  /** Navigate to the freshly-created page. */
  navigate: (path: string) => void;
  /** Build the page route (ROUTES_ABS.page). */
  pageUrl: (id: string) => string;
}

/** Orchestrate a capture: resolve destination → create page with the
 *  title → (when there's a body) parse + persist blocks → navigate.
 *  Pure given its deps; returns the new page id. Body is only persisted
 *  when non-blank, so a title-only capture is a single create. */
export async function runCapture(
  input: CaptureInput,
  deps: CaptureRunnerDeps,
): Promise<string> {
  const { parentId } = resolveCaptureTarget(deps.prefs);
  const page = await deps.createPage(parentId, { title: input.title });
  if (input.body.trim() !== "") {
    await deps.setBlocks(page.id, deps.toBlocks(input.body));
  }
  deps.navigate(deps.pageUrl(page.id));
  return page.id;
}
