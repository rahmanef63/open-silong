"use client";

import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogAction,
} from "@/shared/ui/responsive-alert-dialog";
import type { Template } from "./types";

export function DeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Template | null;
  onClose: () => void;
  onConfirm: (t: Template) => void | Promise<void>;
}) {
  return (
    <ResponsiveAlertDialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>Delete template?</ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            "{target?.name}" will be permanently removed. Existing pages already created from it stay intact.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              if (target) await onConfirm(target);
              onClose();
            }}
          >
            Delete
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
