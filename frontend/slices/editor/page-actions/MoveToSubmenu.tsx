import { useMemo, useState } from "react";
import { useStore } from "@/shared/lib/store";
import type { Page } from "@/shared/types/domain";
import { ArrowRight, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";

export function MoveToSubmenu({ page, close }: { page: Page; close: () => void }) {
  const { pages, movePage } = useStore();
  const [open, setOpen] = useState(false);

  const moveCandidates = useMemo(() => {
    const isDescendant = (targetId: string, ancestorId: string): boolean => {
      let cur = pages.find((p) => p.id === targetId);
      while (cur?.parentId) {
        if (cur.parentId === ancestorId) return true;
        cur = pages.find((p) => p.id === cur!.parentId);
      }
      return false;
    };
    return pages.filter((p) =>
      !p.trashed && !p.rowOfDatabaseId && p.id !== page.id && !isDescendant(p.id, page.id),
    );
  }, [pages, page.id]);

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="h-auto w-full justify-start gap-2 rounded-none px-3 py-1.5 text-sm font-normal [&_svg]:size-3.5"
      >
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1">Move to</span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition", open && "rotate-90")} />
      </Button>
      {open && (
        <div className="bg-muted/30 border-t border-border max-h-48 overflow-y-auto scrollbar-thin">
          <Button
            variant="ghost"
            onClick={() => { movePage(page.id, null); toast.success("Moved to root"); close(); }}
            className={cn(
              "h-auto w-full justify-start gap-2 rounded-none px-5 py-1.5 text-xs font-normal [&_svg]:size-3",
              page.parentId === null && "text-muted-foreground",
            )}
          >
            {page.parentId === null && <Check className="h-3 w-3" />}
            {page.parentId !== null && <span className="w-3" />}
            <span className="flex-1">Workspace root</span>
          </Button>
          {moveCandidates.length === 0 && (
            <div className="px-5 py-2 text-xs text-muted-foreground">No other pages</div>
          )}
          {moveCandidates.map((p) => (
            <Button
              variant="ghost"
              key={p.id}
              onClick={() => { movePage(page.id, p.id); toast.success(`Moved into ${p.title || "Untitled"}`); close(); }}
              className={cn(
                "h-auto w-full justify-start gap-2 rounded-none px-5 py-1.5 text-xs font-normal [&_svg]:size-3",
                page.parentId === p.id && "text-muted-foreground",
              )}
            >
              {page.parentId === p.id && <Check className="h-3 w-3" />}
              {page.parentId !== p.id && <span className="w-3" />}
              <DynamicIcon value={p.icon} className="text-sm" />
              <span className="flex-1 truncate">{p.title || "Untitled"}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
