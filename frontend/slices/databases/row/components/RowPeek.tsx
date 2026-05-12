"use client";

import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useRowOpenMode, type RowOpenMode } from "../lib/useRowOpenMode";
import { RowOpenModeSwitcher } from "./RowOpenModeSwitcher";
import { RowDetailSheet } from "./RowDetailSheet";
import { RowDetailDialog } from "./RowDetailDialog";

interface Props {
  pageId: string | null;
  onOpenChange: (open: boolean) => void;
  /** When false, hide the "Open as full page" button in the switcher —
   *  used when the caller's host page is already the full-page database
   *  view, so navigating a row as page creates an awkward sibling-page
   *  jump. Defaults to true (inline DB embeds). */
  showOpenAsPage?: boolean;
}

/**
 * Row peek controller. Clicking a row always opens in the user's
 * persisted *default* surface (sheet or dialog). The switcher inside
 * the peek lets the user:
 *   • flip between sheet ↔ dialog (and persist that as the new default)
 *   • one-shot "open as full page" (navigate to /p/<id> without
 *     touching the persisted default)
 *
 * Row click never bypasses the peek to navigate directly — that was the
 * earlier behaviour and surprised users who had toggled "page" once.
 */
export function RowPeek({ pageId, onOpenChange, showOpenAsPage = true }: Props) {
  const [mode, setMode] = useRowOpenMode();
  const navigate = useNavigate();

  const handlePickMode = (next: RowOpenMode) => setMode(next);
  const handleOpenAsPage = () => {
    if (!pageId) return;
    onOpenChange(false);
    navigate(ROUTES.page(pageId));
  };

  const switcher = (
    <RowOpenModeSwitcher
      mode={mode}
      onPickMode={handlePickMode}
      onOpenAsPage={handleOpenAsPage}
      showPage={showOpenAsPage}
    />
  );

  if (mode === "dialog") {
    return <RowDetailDialog pageId={pageId} onOpenChange={onOpenChange} headerExtras={switcher} />;
  }
  return <RowDetailSheet pageId={pageId} onOpenChange={onOpenChange} headerExtras={switcher} />;
}
