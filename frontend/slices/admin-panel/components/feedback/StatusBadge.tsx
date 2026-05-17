import { Badge } from "@/shared/ui/badge";
import type { TicketStatus } from "./types";

const META: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: "open",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  in_review: {
    label: "in review",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  resolved: {
    label: "resolved",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  closed: {
    label: "closed",
    className: "border-muted bg-muted text-muted-foreground",
  },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const m = META[status] ?? META.open;
  return (
    <Badge variant="outline" className={`${m.className} text-[10px] px-1.5 py-0 h-4`}>
      {m.label}
    </Badge>
  );
}
