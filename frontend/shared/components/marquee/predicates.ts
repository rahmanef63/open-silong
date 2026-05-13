export function isAlwaysInteractive(t: HTMLElement, skipSelector?: string): boolean {
  // Real interactive HTML tags + Radix item roles. NOTE: do NOT include
  // [role='button'] here — dnd-kit's useSortable spreads role="button"
  // onto BlockShell, so any closest() match would kill the marquee inside
  // every block.
  if (t.closest("button, a, input, textarea, select")) return true;
  if (t.closest("[role='menuitem'], [role='checkbox'], [role='radio'], [role='switch'], [role='separator']")) return true;
  if (t.closest("[data-block-grip]")) return true;
  if (t.closest("[data-block-selection-toolbar]")) return true;
  if (t.closest("[data-row-selection-toolbar]")) return true;
  if (t.closest("[data-radix-popper-content-wrapper]")) return true;
  if (t.closest("[data-radix-portal]")) return true;
  if (t.closest("[data-cell-editing='true']")) return true;
  if (skipSelector && t.closest(skipSelector)) return true;
  return false;
}

export function isTextTarget(t: HTMLElement): boolean {
  if (t.isContentEditable) return true;
  if (t.closest("[contenteditable='true']")) return true;
  return false;
}
