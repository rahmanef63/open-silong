import type { Collision } from "@dnd-kit/core";

/**
 * Given the raw pointerWithin candidates, apply our priority:
 *  1. Leaf hits (non-container droppables) — drop precisely on a sibling/child
 *  2. Container droppables (col:* / toggle:*) — drop into empty space
 *  3. (caller falls back to closestCenter when this returns empty)
 *
 * The container block's OWN sortable id is suppressed when its inner droppable
 * is present in `within` — otherwise dropping inside would be misread as
 * a top-level reorder of the container block itself.
 */
export function prioritizeCollisions(within: Collision[]): Collision[] {
  const containerOwnerIds = new Set<string>();
  for (const c of within) {
    const id = String(c.id);
    const colMatch = id.match(/^col:(.+):\d+$/);
    if (colMatch) containerOwnerIds.add(colMatch[1]);
    const toggleMatch = id.match(/^toggle:(.+)$/);
    if (toggleMatch) containerOwnerIds.add(toggleMatch[1]);
  }
  const filtered = within.filter((c) => !containerOwnerIds.has(String(c.id)));
  const leafHits = filtered.filter((c) => {
    const id = String(c.id);
    return !id.startsWith("col:") && !id.startsWith("toggle:");
  });
  if (leafHits.length) return leafHits;
  return filtered.filter((c) => {
    const id = String(c.id);
    return id.startsWith("col:") || id.startsWith("toggle:");
  });
}
