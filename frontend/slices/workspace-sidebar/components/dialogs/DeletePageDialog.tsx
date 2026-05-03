"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Page being moved to trash. null when no target. */
  page: { id: string; title: string; icon: string } | null;
  onConfirm: (pageId: string) => Promise<void> | void;
}

export function DeletePageDialog({ open, onOpenChange, page, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!page || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(page.id);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Move to trash?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="inline-flex items-center gap-1.5">
              <span>{page?.icon}</span>
              <span className="font-medium text-foreground">{page?.title || "Untitled"}</span>
            </span>{" "}
            and any subpages will be moved to trash. You can restore them later from the Trash view.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? "Moving…" : "Move to trash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
