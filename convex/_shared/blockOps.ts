/** Pure block-array manipulation — extracted from convex/pages.ts block
 *  mutations so the array logic is unit-testable + the handlers stay
 *  thin (auth + rate-limit + searchText + webhook concerns only).
 *
 *  PURE: no Convex/DOM deps. Each fn takes a blocks array + args and
 *  returns the next array (+ any generated id). Handlers keep ownership
 *  of validation (block caps, auth) and persistence. The `uid` generator
 *  is injected so callers control id shape + tests stay deterministic.
 */

export interface BlockLike {
  id: string;
  type?: string;
  text?: string;
  checked?: boolean;
  layoutGroup?: string;
  layoutCol?: number;
  [k: string]: unknown;
}

type Uid = () => string;

/** Insert a fresh block after `afterIndex`. Returns next array + new id. */
export function addBlockToArray(
  blocks: BlockLike[],
  afterIndex: number,
  type: string | undefined,
  init: Record<string, unknown> | undefined,
  uid: Uid,
): { blocks: BlockLike[]; newId: string } {
  const newId = uid();
  const next = [...blocks];
  next.splice(afterIndex + 1, 0, {
    id: newId,
    type: type ?? "paragraph",
    text: "",
    checked: type === "todo" ? false : undefined,
    ...(init ?? {}),
  });
  return { blocks: next, newId };
}

/** Replace a block by id, preserving the existing id on the replacement.
 *  Returns null when the id isn't found (caller throws). */
export function replaceBlockInArray(
  blocks: BlockLike[],
  blockId: string,
  nextBlock: Record<string, unknown>,
): BlockLike[] | null {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx < 0) return null;
  return [...blocks.slice(0, idx), { ...nextBlock, id: blockId } as BlockLike, ...blocks.slice(idx + 1)];
}

/** Duplicate a block by id (fresh id), inserted immediately after.
 *  Returns null when not found. */
export function duplicateBlockInArray(
  blocks: BlockLike[],
  blockId: string,
  uid: Uid,
): { blocks: BlockLike[]; newId: string } | null {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx < 0) return null;
  const newId = uid();
  const dup = { ...blocks[idx], id: newId };
  return { blocks: [...blocks.slice(0, idx + 1), dup, ...blocks.slice(idx + 1)], newId };
}

/** Splice incoming blocks after `anchorBlockId` (or replacing it). Incoming
 *  blocks inherit the anchor's layout stamps when they don't carry their
 *  own. Returns null when the anchor isn't found. */
export function insertBlocksAfterAnchor(
  blocks: BlockLike[],
  anchorBlockId: string,
  incoming: BlockLike[],
  replaceAnchor: boolean,
): BlockLike[] | null {
  const idx = blocks.findIndex((b) => b.id === anchorBlockId);
  if (idx < 0) return null;
  const anchor = blocks[idx];
  const stamped = incoming.map((b) => {
    const out = { ...b };
    if (out.layoutGroup == null && anchor.layoutGroup != null) {
      out.layoutGroup = anchor.layoutGroup;
      out.layoutCol = anchor.layoutCol;
    }
    return out;
  });
  return replaceAnchor
    ? [...blocks.slice(0, idx), ...stamped, ...blocks.slice(idx + 1)]
    : [...blocks.slice(0, idx + 1), ...stamped, ...blocks.slice(idx + 1)];
}

/** Merge `patch` into the block matching `blockId`. No-op (returns same
 *  set, new array) when the id isn't present. */
export function updateBlockInArray(
  blocks: BlockLike[],
  blockId: string,
  patch: Record<string, unknown>,
): BlockLike[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
}

/** Remove a block by id. Seeds one empty paragraph when the page would
 *  become empty so the cursor always has a landing spot. */
export function deleteBlockFromArray(
  blocks: BlockLike[],
  blockId: string,
  uid: Uid,
): BlockLike[] {
  const next = blocks.filter((b) => b.id !== blockId);
  return next.length ? next : [{ id: uid(), type: "paragraph", text: "" }];
}

/** Reorder to match `orderedIds`. Blocks not named in the list are
 *  dropped (matches the dnd-kit drop contract). */
export function reorderBlocksInArray(
  blocks: BlockLike[],
  orderedIds: string[],
): BlockLike[] {
  const map = new Map(blocks.map((b) => [b.id, b]));
  return orderedIds.map((id) => map.get(id)).filter((b): b is BlockLike => !!b);
}
