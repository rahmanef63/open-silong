"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { useConfirm } from "@/shared/components/ConfirmProvider";
import { toast } from "sonner";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function DbBulkActionBar({ selectedIds, onClear }: Props) {
  const { trashDatabase } = useStore();
  const trashOp = useAsyncError("library.dbBulkTrash");
  const confirm = useConfirm();
  if (selectedIds.length === 0) return null;

  const handleTrash = async () => {
    const ok2 = await confirm({
      title: `Move ${selectedIds.length} database${selectedIds.length === 1 ? "" : "s"} to trash?`,
      description: "Rows are kept. You can restore from the Trash within 30 days.",
      variant: "destructive",
      confirmLabel: "Move to trash",
    });
    if (!ok2) return;
    const ok = await trashOp.execute(async () => {
      for (const id of selectedIds) trashDatabase(id);
    });
    if (ok !== undefined) {
      toast.success("Moved to trash");
      onClear();
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Database bulk actions"
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 flex items-center gap-1 rounded-full border border-border bg-card/95 backdrop-blur shadow-lg px-2 py-1.5"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <span className="text-xs text-muted-foreground px-2 tabular-nums">
        {selectedIds.length} database{selectedIds.length === 1 ? "" : "s"} selected
      </span>
      <span className="h-5 w-px bg-border" />
      <Button
        size="sm"
        variant="ghost"
        onClick={handleTrash}
        disabled={trashOp.pending}
        className="text-destructive hover:text-destructive"
        title="Move to trash"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <span className="h-5 w-px bg-border" />
      <Button size="sm" variant="ghost" onClick={onClear} title="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
