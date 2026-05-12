"use client";

import { useEffect } from "react";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { useRowOpenMode, type RowOpenMode } from "../lib/useRowOpenMode";
import { RowOpenModeSwitcher } from "./RowOpenModeSwitcher";
import { RowDetailSheet } from "./RowDetailSheet";
import { RowDetailDialog } from "./RowDetailDialog";

interface Props {
  pageId: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Unified row-peek entry. Reads the per-user "row open mode" preference
 * (sheet | dialog | page) and renders the matching surface. Switching
 * mode mid-peek keeps the same row open in the new surface; switching to
 * "page" closes the peek and navigates to /p/:id.
 *
 * Use this from DatabaseBlock (and anywhere else that needs to peek a
 * row) instead of mounting RowDetailSheet directly.
 */
export function RowPeek({ pageId, onOpenChange }: Props) {
  const [mode, setMode] = useRowOpenMode();
  const navigate = useNavigate();

  // If the user's persisted preference is "page", clicking a row should
  // navigate immediately instead of opening any modal.
  useEffect(() => {
    if (!pageId || mode !== "page") return;
    onOpenChange(false);
    navigate(ROUTES.page(pageId));
  }, [pageId, mode, navigate, onOpenChange]);

  const handleSwitch = (next: RowOpenMode) => {
    if (next === "page") {
      if (pageId) {
        onOpenChange(false);
        navigate(ROUTES.page(pageId));
      }
      setMode(next);
      return;
    }
    setMode(next);
  };

  const switcher = <RowOpenModeSwitcher mode={mode} onChange={handleSwitch} />;

  if (mode === "page") return null;
  if (mode === "dialog") {
    return <RowDetailDialog pageId={pageId} onOpenChange={onOpenChange} headerExtras={switcher} />;
  }
  return <RowDetailSheet pageId={pageId} onOpenChange={onOpenChange} headerExtras={switcher} />;
}
