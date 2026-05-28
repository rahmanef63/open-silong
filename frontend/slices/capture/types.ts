/** Phase 2 — Quick Capture. Foundational capture-loop primitive: turn a
 *  blob of text into a new page in a designated destination, from
 *  anywhere (command palette, keyboard shortcut, and — later — web
 *  clipper / share-sheet / email-in, which all route through the same
 *  parse + target-resolution core). */

/** Where a captured note lands. */
export type CaptureDestination =
  | { kind: "inbox" }                       // dedicated capture inbox page
  | { kind: "page"; pageId: string }        // as a child of a specific page
  | { kind: "workspace-root" };             // top-level in the active workspace

export interface CapturePrefs {
  /** User's chosen default destination. Falls back to workspace-root. */
  defaultDestination?: CaptureDestination;
  /** Optional pinned inbox page id (resolved when destination.kind === "inbox"). */
  inboxPageId?: string;
}

/** Parsed capture input — first non-empty line becomes the title, the
 *  remainder becomes the body (markdown source, parsed to blocks downstream). */
export interface CaptureInput {
  title: string;
  /** Raw markdown body (may be empty). Parsed via the existing
   *  markdown→blocks parser at write time. */
  body: string;
}

/** Resolved write target — what the create-page call needs. */
export interface CaptureTarget {
  /** parentId for the new page; null = top-level. */
  parentId: string | null;
}
