import { useQuery } from "convex/react";
import { Eye } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface Props {
  pageId: string;
  className?: string;
}

function relative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function SeenByBadge({ pageId, className }: Props) {
  const viewers = useQuery(api.pageViews.recentViewers, { pageId: pageId as Id<"pages"> });
  if (!viewers || viewers.length === 0) return null;
  const top = viewers[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto gap-1 px-2 py-1 text-[11px] font-normal text-muted-foreground hover:bg-accent",
            className,
          )}
          title={`Seen by ${viewers.length} ${viewers.length === 1 ? "person" : "people"}`}
        >
          <Eye className="h-3 w-3" />
          {viewers.length === 1
            ? `Seen by ${top.name}`
            : `Seen by ${viewers.length}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent viewers
        </div>
        <ul className="space-y-1">
          {viewers.map((v) => (
            <li key={String(v.userId)} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs">{v.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{relative(v.lastViewedAt)}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
