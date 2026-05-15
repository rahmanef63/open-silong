import type { Comment, TargetRef } from "../types";

/**
 * Props-driven adapter — the kitab portable surface (v0.2.0).
 *
 * The portable slice cannot import `convex/react` directly (R3 — kept under
 * `npx tsc --noEmit` + validate-structure). The consumer wires its own
 * client and hands the binding in.
 *
 * Reference adapter for a Convex consumer (kept out of the portable slice):
 *
 *   import { useQuery, useMutation } from "convex/react";
 *   import { api } from "@convex/_generated/api";
 *   const bindings: CommentsBindings = {
 *     list: (target) =>
 *       useQuery(api["features/comments/queries"].listByTarget,
 *         target.id ? target : "skip")?.map(toComment),
 *     create:  useMutation(api["features/comments/mutations"].create),
 *     update:  useMutation(api["features/comments/mutations"].update),
 *     resolve: useMutation(api["features/comments/mutations"].resolve),
 *     remove:  useMutation(api["features/comments/mutations"].remove),
 *   };
 *   const c = useCommentsCore(bindings, { target: { kind: "page", id: someId } });
 */
export type CommentsBindings = {
  list: (target: TargetRef) => Comment[] | undefined;
  create: (input: {
    target: TargetRef;
    text: string;
  }) => Promise<void> | void;
  update: (input: { id: string; text: string }) => Promise<void> | void;
  resolve: (input: {
    id: string;
    resolved: boolean;
  }) => Promise<void> | void;
  remove: (input: { id: string }) => Promise<void> | void;
};

export type UseCommentsCoreOpts = {
  /** Target to load comments for. Omit to skip the fetch. */
  target?: TargetRef;
  /** Reserved words the consumer wants blocked at create-time. */
  forbiddenWords?: readonly string[];
};

/** Kitab v0.2.0 portable hook — props-driven, no Convex import. */
export function useCommentsCore(
  bindings: CommentsBindings,
  opts: UseCommentsCoreOpts,
) {
  const raw = opts.target ? bindings.list(opts.target) : undefined;

  const items: Comment[] = (raw ?? [])
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);

  const forbiddenWords = opts.forbiddenWords ?? [];

  const create: CommentsBindings["create"] = (input) => {
    if (forbiddenWords.length) {
      const lower = input.text.toLowerCase();
      for (const w of forbiddenWords) {
        if (!w) continue;
        if (lower.includes(w.toLowerCase())) {
          throw new Error(`comment contains forbidden term: "${w}"`);
        }
      }
    }
    return bindings.create(input);
  };

  return {
    isLoading: raw === undefined,
    items,
    openCount: items.filter((c) => !c.resolved).length,
    create,
    update: bindings.update,
    resolve: bindings.resolve,
    remove: bindings.remove,
  };
}
