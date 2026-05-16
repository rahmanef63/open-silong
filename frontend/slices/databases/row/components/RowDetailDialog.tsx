"use client";

import { type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { useFullPage } from "@/slices/editor";
import { RowDetailBody } from "./RowDetailBody";

interface Props {
  pageId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Mode switcher rendered in the header. Pass null to hide. */
  headerExtras?: ReactNode;
}

/**
 * Centered-dialog variant of the row peek. Wider + taller than a typical
 * dialog so the row-blocks editing surface stays usable. Body identical
 * to RowDetailSheet so toggling between the two preserves edit state.
 */
export function RowDetailDialog({ pageId, onOpenChange, headerExtras }: Props) {
  const fullPage = useFullPage(pageId ?? null);
  const title = fullPage?.title || "Untitled row";

  return (
    <Dialog open={!!pageId} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-3xl w-[95vw] h-[85vh] gap-0 flex flex-col overflow-hidden [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Row detail</DialogDescription>
        {pageId && (
          <RowDetailBody
            pageId={pageId}
            headerExtras={headerExtras}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
