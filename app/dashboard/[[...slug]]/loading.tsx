export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:block w-64 border-r border-border bg-sidebar">
        <div className="p-3 space-y-2">
          <div className="h-8 rounded bg-muted/30 animate-pulse" />
          <div className="h-6 w-3/4 rounded bg-muted/30 animate-pulse" />
          <div className="h-6 w-2/3 rounded bg-muted/30 animate-pulse" />
        </div>
      </aside>
      <main className="flex-1 p-6 space-y-3">
        <div className="h-8 w-1/3 rounded bg-muted/40 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted/30 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse" />
      </main>
    </div>
  );
}
