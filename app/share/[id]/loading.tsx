export default function Loading() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background/80 backdrop-blur px-6 h-12 flex items-center justify-between">
        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </header>
      <article className="mx-auto max-w-3xl px-6 md:px-12 pt-16 space-y-6">
        <div className="h-12 w-12 rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-3/4 rounded-md bg-muted animate-pulse" />
        <div className="space-y-2 pt-6">
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-muted animate-pulse" />
          <div className="h-4 w-9/12 rounded bg-muted animate-pulse" />
          <div className="h-4 w-10/12 rounded bg-muted animate-pulse" />
        </div>
      </article>
    </div>
  );
}
