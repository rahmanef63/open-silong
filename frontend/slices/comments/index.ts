// Renderless kitab-portable core (consume with explicit fetcher + viewer).
export {
  CommentsProvider,
  useComments as useCommentsContext,
  useThreadComments,
  type CommentsContextValue,
  type CommentMutator,
  type CommentMutators,
} from "./lib/CommentsContext";
export { ThreadPopover, type ThreadPopoverLabels } from "./components/ThreadPopover";
export { CommentItem } from "./components/CommentItem";
export { CommentComposer } from "./components/CommentComposer";
export { PageCommentsPanel } from "./components/PageCommentsPanel";
export type { Comment } from "./types";

// Nosion-bound consumer adapters — back-compat aliases for the dashboard.
export {
  PageCommentsProvider,
  useBlockComments,
  BlockCommentsPopover,
} from "./adapters/nosion";

// Nosion standalone hook (no Provider needed) — re-exported with both
// the legacy `useComments` name (back-compat) and the disambiguated
// `useStandaloneComments` name.
export { useComments, useStandaloneComments } from "./hooks/useComments";

// Nosion alias preserving the legacy `usePageComments` name. Outside the
// dashboard editor only `useStandaloneComments` is used; inside the editor
// `useComments` (the context hook above, exported as `useCommentsContext`)
// gates render — `usePageComments` is the historical name for that.
export { useComments as usePageComments } from "./lib/CommentsContext";
