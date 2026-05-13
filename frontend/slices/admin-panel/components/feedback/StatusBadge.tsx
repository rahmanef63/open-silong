import { Badge } from "@/shared/ui/badge";

export function StatusBadge({ status }: { status: "open" | "resolved" }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "resolved"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 h-4"
      }
    >
      {status}
    </Badge>
  );
}
