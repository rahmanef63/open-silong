import type { CaptureInput, CapturePrefs, CaptureTarget } from "../types";

/** Parse a raw capture blob into { title, body }. Rules (Notion-like):
 *  - First non-empty line → title (markdown heading markers stripped).
 *  - Everything AFTER that first line → body (verbatim markdown, leading
 *    blank lines trimmed).
 *  - Empty input → empty title + body (caller decides default title).
 *  Pure — no DOM, no parsing of the body here (the body stays markdown
 *  source; the create-page path runs markdownToBlocks). */
export function parseCaptureInput(raw: string): CaptureInput {
  const text = (raw ?? "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  // Find first non-empty line for the title.
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return { title: "", body: "" };

  const titleLine = lines[i].trim().replace(/^#{1,6}\s+/, ""); // strip heading markers
  const rest = lines.slice(i + 1);

  // Trim leading blank lines off the body, keep the rest verbatim.
  let j = 0;
  while (j < rest.length && rest[j].trim() === "") j++;
  const body = rest.slice(j).join("\n").trimEnd();

  return { title: titleLine, body };
}

/** Resolve the write target (parentId) from prefs + the active workspace.
 *  Pure — the caller supplies the resolved inbox page id (if any) since
 *  that requires a lookup. Falls back to workspace-root (parentId null)
 *  whenever a more specific target can't be resolved. */
export function resolveCaptureTarget(prefs: CapturePrefs | undefined): CaptureTarget {
  const dest = prefs?.defaultDestination ?? { kind: "workspace-root" as const };
  switch (dest.kind) {
    case "page":
      return { parentId: dest.pageId };
    case "inbox":
      // Inbox is itself a page; capture lands as its child when pinned,
      // else degrades to workspace-root.
      return { parentId: prefs?.inboxPageId ?? null };
    case "workspace-root":
    default:
      return { parentId: null };
  }
}

/** Convenience: is this capture blob effectively empty (nothing to save)? */
export function isEmptyCapture(raw: string): boolean {
  return (raw ?? "").trim() === "";
}

/** Derive a display title with a sensible fallback for untitled captures. */
export function captureTitleOrDefault(input: CaptureInput): string {
  return input.title.trim() || "Quick note";
}
