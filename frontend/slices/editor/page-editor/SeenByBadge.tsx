import { Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import { useNotionAdapter } from "@/slices/notion";

interface Props {
  pageId: string;
  className?: string;
}

export function SeenByBadge({ pageId, className }: Props) {
  const adapter = useNotionAdapter();
  // Presence is an optional adapter capability — hide the badge
  // entirely on deployments that don't wire it. The hook must always
  // be called (React rules), so we call it with a guard then no-op
  // when the capability is absent.
  const viewers = adapter.presence?.useRecentViewers(pageId);
  if (!adapter.presence || !viewers || viewers.length === 0) return null;
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
            <li key={v.userId} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs">{v.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelTime(v.lastSeenAt)}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
