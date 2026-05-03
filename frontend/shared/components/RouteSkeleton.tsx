import { Skeleton } from "@/shared/ui/skeleton";

export function RouteSkeleton() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <Skeleton className="h-9 w-2/3 mb-4" />
      <Skeleton className="h-4 w-1/3 mb-8" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PageBodySkeleton() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Skeleton className="h-12 w-12 mb-4 rounded-md" />
      <Skeleton className="h-10 w-2/3 mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5" style={{ width: `${50 + ((i * 13) % 50)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function DatabaseSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="border-b border-border bg-muted/30 p-2 flex items-center gap-2">
        <Skeleton className="h-6 w-32" />
        <div className="ml-auto flex gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex border-b border-border last:border-0">
          <div className="w-8 shrink-0 border-r border-border" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="border-r border-border last:border-0 min-w-[160px] flex-1 p-2">
              <Skeleton className="h-4" style={{ width: `${40 + ((i * 7 + j * 11) % 50)}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
