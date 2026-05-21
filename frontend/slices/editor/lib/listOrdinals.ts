import type { Block } from "@/shared/types/domain";

/** Compute 1-based ordinals for consecutive `numbered` blocks in a
 *  flat children array (toggle children / column pane / synced source).
 *  Resets on any non-`numbered` block.
 *
 *  PageEditor uses a richer indent-aware version inline; nested
 *  containers don't propagate indent, so the flat counter is enough
 *  to render `1. 2. 3.` cleanly inside a list that lives in a
 *  container body. */
export function computeOrdinals(children: Block[]): Map<string, number> {
  const out = new Map<string, number>();
  let counter = 0;
  for (const c of children) {
    if (c.type === "numbered") {
      counter += 1;
      out.set(c.id, counter);
    } else {
      counter = 0;
    }
  }
  return out;
}
