import { Share2, History, Star } from "lucide-react";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
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
      <Button variant="outline" size="sm" onClick={onShare}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onHistory}
        className={cn("h-8 w-8 text-muted-foreground", historyOpen && "bg-accent text-foreground")}
        aria-label="Version history"
      >
        <History className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFavorite(page.id)}
        className="h-8 w-8 text-muted-foreground"
        aria-label="Favorite"
      >
        <Star className={cn("h-4 w-4", page.favorite && "fill-brand text-brand")} />
      </Button>
      <PageActionsMenu page={page} onShowHistory={onHistory} />
    </div>
  );
}
