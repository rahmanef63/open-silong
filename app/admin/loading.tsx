export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 rounded bg-muted/40 animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted/30 animate-pulse" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded bg-muted/30 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
            <div className="h-7 w-12 bg-muted/40 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
