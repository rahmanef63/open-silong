export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

export function focusSiblingBySelector(current: HTMLElement, selector: string, delta: 1 | -1): boolean {
  const scope = current.closest<HTMLElement>("[data-keyboard-scope]") ?? document;
  const anchor = current.closest<HTMLElement>(selector) ?? current;
  const items = Array.from(scope.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    const disabled = el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
    return !disabled && el.offsetParent !== null;
  });
  const index = items.indexOf(anchor);
  if (index === -1) return false;
  const next = items[index + delta];
  if (!next) return false;
  next.focus();
  return true;
}
