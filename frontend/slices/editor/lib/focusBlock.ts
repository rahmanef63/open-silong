/** Centralized block-DOM focus helpers. Several editor sub-components
 *  (synced block, nested cap, command palette landing) used to grep the
 *  DOM via `document.querySelector<HTMLElement>(\`[data-block-id="…"]\`)`
 *  inline. Hoisting here keeps the contract (`data-block-id` attribute
 *  on every block root) in one place so changing the selector is a
 *  single-file edit. */

const SELECTOR = (id: string) => `[data-block-id="${cssEscape(id)}"]`;

function cssEscape(value: string): string {
  // Block ids are uid()-generated (lowercase alphanumeric) so they're
  // already CSS-safe. The escape is defensive against future id schemes.
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/(["\\\]\[])/g, "\\$1");
}

/** Resolve the DOM root for a given block id, or null when not mounted. */
export function findBlockNode(blockId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(SELECTOR(blockId));
}

/** Focus the block root. Optionally delay via `setTimeout` so React has
 *  a tick to mount newly-inserted blocks before we try to focus them. */
export function focusBlockSoon(blockId: string, delayMs = 30): void {
  if (delayMs <= 0) {
    findBlockNode(blockId)?.focus();
    return;
  }
  setTimeout(() => findBlockNode(blockId)?.focus(), delayMs);
}
