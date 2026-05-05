import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface Props {
  /** Number of skeleton rows to render. Default 5. */
  count?: number;
  /** Indent depth for nested-style skeletons. */
  depth?: number;
}

/** Animated placeholder rows for the sidebar tree while pages query is
 *  loading. Matches SortablePageRow geometry so the layout doesn't jump. */
export function PageRowSkeleton({ count = 5, depth = 0 }: Props) {
  return (
    <div className="space-y-0.5 py-1" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("flex items-center gap-2 rounded-md px-2 py-1")}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3" style={{ width: `${50 + ((i * 13) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
