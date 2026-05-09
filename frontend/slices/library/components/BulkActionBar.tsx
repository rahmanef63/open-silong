"use client";

import { Star, Trash2, Download, X, Globe2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import { useWorkspaceIO } from "@/slices/workspace-io";
import { toast } from "sonner";
import { reportError } from "@/shared/lib/error";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, onClear }: Props) {
  const { pages, toggleFavorite, togglePublic, deletePage } = useStore();
  const workspaceIO = useWorkspaceIO();

  if (selectedIds.length === 0) return null;
  const selectedPages = pages.filter((p) => selectedIds.includes(p.id));
  const allFavorite = selectedPages.every((p) => p.favorite);
  const allPublic = selectedPages.every((p) => p.isPublic);

  const handleFav = () => {
    try {
      for (const p of selectedPages) {
        // toggleFavorite already flips per-page; for "make all favorite",
        // skip pages already in target state.
        if (allFavorite || !p.favorite) toggleFavorite(p.id);
      }
      toast.success(allFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (e) {
      const safe = reportError("library.bulkFavorite", e);
      toast.error(safe.message);
    }
  };

  const handlePublic = () => {
    try {
      for (const p of selectedPages) {
        if (allPublic || !p.isPublic) togglePublic(p.id);
      }
      toast.success(allPublic ? "Made private" : "Made public");
    } catch (e) {
      const safe = reportError("library.bulkPublic", e);
      toast.error(safe.message);
    }
  };

  const handleTrash = () => {
    if (!confirm(`Move ${selectedIds.length} page${selectedIds.length === 1 ? "" : "s"} to trash?`)) return;
    try {
      for (const id of selectedIds) deletePage(id);
      toast.success("Moved to trash");
      onClear();
    } catch (e) {
      const safe = reportError("library.bulkTrash", e);
      toast.error(safe.message);
    }
  };

  const handleExport = () => {
    workspaceIO.open({ tab: "export", preselectPageId: selectedIds[0] });
  };

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 flex items-center gap-1 rounded-full border border-border bg-card/95 backdrop-blur shadow-lg px-2 py-1.5"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <span className="text-xs text-muted-foreground px-2 tabular-nums">
        {selectedIds.length} selected
      </span>
      <span className="h-5 w-px bg-border" />
      <Button size="sm" variant="ghost" onClick={handleFav} title={allFavorite ? "Remove favorite" : "Add to favorites"}>
        <Star className={`h-4 w-4 ${allFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
      </Button>
      <Button size="sm" variant="ghost" onClick={handlePublic} title={allPublic ? "Make private" : "Make public"}>
        <Globe2 className={`h-4 w-4 ${allPublic ? "text-emerald-500" : ""}`} />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleExport} title="Export selection as JSON">
        <Download className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleTrash} title="Move to trash" className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
      <span className="h-5 w-px bg-border" />
      <Button size="sm" variant="ghost" onClick={onClear} title="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
