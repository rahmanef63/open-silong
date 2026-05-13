import { Share2, History, Star } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import type { Page } from "@/shared/types/domain";
import { PageActionsMenu } from "../PageActionsMenu";

interface Props {
  page: Page;
  onShare: () => void;
  onHistory: () => void;
  historyOpen: boolean;
}

export function HeaderActions({ page, onShare, onHistory, historyOpen }: Props) {
  const { toggleFavorite, saving } = useStore();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className={cn("text-xs text-muted-foreground mr-1 hidden sm:inline", saving && "animate-pulse-soft")}>
        {saving ? "Saving…" : "Saved"}
      </span>
      <button onClick={onShare} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      <button
        onClick={onHistory}
        className={cn("flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground", historyOpen && "bg-accent text-foreground")}
        aria-label="Version history"
      >
        <History className="h-4 w-4" />
      </button>
      <button
        onClick={() => toggleFavorite(page.id)}
        className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent text-muted-foreground"
        aria-label="Favorite"
      >
        <Star className={cn("h-4 w-4", page.favorite && "fill-brand text-brand")} />
      </button>
      <PageActionsMenu page={page} onShowHistory={onHistory} />
    </div>
  );
}
