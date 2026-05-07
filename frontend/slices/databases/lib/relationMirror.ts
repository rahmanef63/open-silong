/** Pure helpers for two-way relation mirroring.
 *
 *  When a row's relation property changes from `prior → next`, the
 *  inverse property on each affected target row needs to gain or lose
 *  the source row id. This module exposes the pure diff so the store
 *  side-effect can be tested without Convex / React.
 */

interface MirrorPlanInput {
  /** The row hosting the relation property being edited. */
  srcRowId: string;
  /** Old value on the source row's `rowProps[propId]` (any shape). */
  prior: unknown;
  /** New value the user committed. */
  next: unknown;
}

export interface MirrorPlan {
  /** Target row ids the source was newly linked to — must gain srcRowId in their inverse prop. */
  added: string[];
  /** Target row ids the source was unlinked from — must lose srcRowId in their inverse prop. */
  removed: string[];
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** Compute the add/remove diff between `prior` and `next` (both expected
 *  to be string[] or coerced from unknown). The `srcRowId` is unused at
 *  this layer — provided so callers can keep arg shape consistent with
 *  the mirror application step. */
export function planRelationMirror({ srcRowId: _src, prior, next }: MirrorPlanInput): MirrorPlan {
  const a = arr(prior);
  const b = arr(next);
  return {
    added: b.filter((id) => !a.includes(id)),
    removed: a.filter((id) => !b.includes(id)),
  };
}

/** Apply a mirror diff to a target row's inverse value. Returns the
 *  next value (string[]) — caller is responsible for the actual db
 *  patch. Idempotent — duplicate adds are deduped, removes that
 *  weren't present are no-ops. */
export function applyMirrorToInverse(
  current: unknown,
  srcRowId: string,
  side: "add" | "remove",
): string[] {
  const cur = arr(current);
  if (side === "add") {
    return cur.includes(srcRowId) ? cur : [...cur, srcRowId];
  }
  return cur.filter((id) => id !== srcRowId);
}
