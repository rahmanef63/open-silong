import type { ButtonAction, PropertyValue } from "@/shared/types/domain";

/** Side-effect handlers injected by the cell so the dispatcher itself
 *  stays pure + unit-testable (no window / adapter / router coupling). */
export interface ButtonActionHandlers {
  openUrl: (url: string) => void;
  openPage: (pageId: string) => void;
  /** Returns false to CANCEL — halts the remaining action chain
   *  (Notion's confirmation semantics). */
  confirm: (message: string) => boolean;
  editProperty: (propId: string, value: PropertyValue) => void;
}

/** Run a button's action list in order. A `show_confirmation` whose
 *  handler returns false stops the chain (matches Notion — a cancelled
 *  confirmation aborts subsequent actions). Unknown action kinds are
 *  skipped defensively. Returns the count of actions actually run. */
export function runButtonActions(
  actions: ReadonlyArray<ButtonAction>,
  h: ButtonActionHandlers,
): number {
  let ran = 0;
  for (const a of actions) {
    switch (a.kind) {
      case "open_url":
        h.openUrl(a.url);
        ran++;
        break;
      case "open_page":
        h.openPage(a.pageId);
        ran++;
        break;
      case "show_confirmation":
        ran++;
        if (!h.confirm(a.message)) return ran; // cancelled → abort chain
        break;
      case "edit_property":
        h.editProperty(a.propId, a.value);
        ran++;
        break;
      default:
        break; // unknown kind — skip
    }
  }
  return ran;
}
