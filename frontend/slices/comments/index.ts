// ─── Kitab v0.2.0 portable surface ──────────────────────────────────────────

// Renderless context-based provider (consumer feeds a pre-fetched list).
export {
  CommentsProvider,
  useComments as useCommentsContext,
  useThreadComments,
  type CommentsContextValue,
  type CommentMutator,
  type CommentMutators,
} from "./lib/CommentsContext";

// Props-driven core hook (kitab v0.2.0 contract — no Convex import inside).
export {
  useCommentsCore,
  type CommentsBindings,
  type UseCommentsCoreOpts,
} from "./hooks/useCommentsCore";

// Renderless wrappers (kitab v0.2.0 contract).
export { CommentsAnchor, type CommentsAnchorProps } from "./components/CommentsAnchor";
export { CommentsThread, type CommentsThreadProps } from "./components/CommentsThread";

// Renderless thread popover + presentational primitives.
export { ThreadPopover, type ThreadPopoverLabels } from "./components/ThreadPopover";
export { CommentItem } from "./components/CommentItem";
export { CommentComposer } from "./components/CommentComposer";

// Domain-neutral types.
export type { Comment, TargetRef } from "./types";

// ─── Nosion-bound consumer adapters (excluded from kitab UP-sync) ───────────

export {
  PageCommentsProvider,
  useBlockComments,
  BlockCommentsPopover,
} from "./adapters/nosion";

export { PageCommentsPanel } from "./adapters/PageCommentsPanel";

// Nosion standalone hook (no Provider needed) — re-exported with both
// the legacy `useComments` name (back-compat) and the disambiguated
// `useStandaloneComments` name.
export {
  useComments,
  useStandaloneComments,
} from "./adapters/nosionStandalone";

// Nosion alias preserving the legacy `usePageComments` name. Outside the
// dashboard editor only `useStandaloneComments` is used; inside the editor
// `useComments` (the context hook above, exported as `useCommentsContext`)
// gates render — `usePageComments` is the historical name for that.
export { useComments as usePageComments } from "./lib/CommentsContext";
