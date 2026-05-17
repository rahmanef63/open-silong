import { BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { usePageAnalytics } from "../hooks/usePageAnalytics";
import type { Page } from "@/shared/types/domain";

interface Props { page: Page; trigger?: React.ReactNode }

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function AnalyticsPopover({ page, trigger }: Props) {
  const stats = usePageAnalytics(page);
  if (!stats) return null;

  const rows: { label: string; value: string }[] = [
    { label: "Blocks", value: String(stats.blocks) },
    { label: "Words", value: stats.words.toLocaleString() },
    { label: "Characters", value: stats.characters.toLocaleString() },
    { label: "Subpages", value: String(stats.subpages) },
    { label: "Comments", value: String(stats.commentCount) },
    { label: "Snapshots", value: String(stats.snapshotCount) },
    { label: "Last edit", value: formatDuration(stats.lastEditMs) + " ago" },
    { label: "Age", value: formatDuration(stats.ageMs) },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded text-muted-foreground" aria-label="Analytics">
            <BarChart3 className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3" /> Updates &amp; analytics
        </div>
        <div className="p-2 space-y-0.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-accent">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
