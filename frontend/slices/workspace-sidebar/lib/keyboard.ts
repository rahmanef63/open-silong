import type { Page } from "@/shared/types/domain";
import { focusSiblingBySelector, isTextInputTarget } from "@/shared/lib/keyboard";

export interface TreeItem { page: Page; depth: number; parentId: string | null }

export function handleSidebarTraversal(e: React.KeyboardEvent<HTMLElement>, selector: string) {
  if (isTextInputTarget(e.target)) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    focusSiblingBySelector(e.currentTarget, selector, e.key === "ArrowDown" ? 1 : -1);
  }
}

export function handleTreeKey(
  e: React.KeyboardEvent<HTMLElement>,
  item: TreeItem,
  kids: Page[],
  isOpen: boolean,
  setOpen: (open: boolean) => void,
) {
  if (isTextInputTarget(e.target)) return;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    focusSiblingBySelector(e.currentTarget, "[data-sidebar-tree-item]", e.key === "ArrowDown" ? 1 : -1);
    return;
  }

  if (e.key === "ArrowRight" && kids.length > 0) {
    e.preventDefault();
    if (!isOpen) {
      setOpen(true);
      return;
    }
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-sidebar-parent-id="${item.page.id}"]`)?.focus();
    }, 0);
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (isOpen && kids.length > 0) {
      setOpen(false);
      return;
    }
    if (item.parentId) {
      document.querySelector<HTMLElement>(`[data-sidebar-page-id="${item.parentId}"]`)?.focus();
    }
  }
}
