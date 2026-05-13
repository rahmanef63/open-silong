export function PageEditorSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border h-10 px-4 flex items-center" />
      <div className="flex-1 overflow-hidden px-4 sm:px-6 md:px-12 pt-16">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-12 w-12 rounded-md bg-muted animate-pulse" />
          <div className="h-12 w-3/4 rounded-md bg-muted animate-pulse" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/6 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
