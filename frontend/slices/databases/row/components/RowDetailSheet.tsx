"use client";

import { type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { useNotionAdapter } from "@/slices/notion";
import { RowDetailBody } from "./RowDetailBody";

interface Props {
  pageId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Mode switcher rendered in the header. Pass null to hide. */
  headerExtras?: ReactNode;
}

export function RowDetailSheet({ pageId, onOpenChange, headerExtras }: Props) {
  const fullPage = useNotionAdapter().pages.useOne(pageId ?? null);
  const title = fullPage?.title || "Untitled row";

  return (
    <Sheet open={!!pageId} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full p-0 flex flex-col gap-0 [&>button.absolute]:hidden"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">Row detail</SheetDescription>
        {pageId && (
          <RowDetailBody
            pageId={pageId}
            headerExtras={headerExtras}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
