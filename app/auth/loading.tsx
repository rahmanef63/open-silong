export default function AuthLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-full max-w-sm space-y-3 p-6">
        <div className="h-8 w-32 mx-auto rounded bg-muted/40 animate-pulse" />
        <div className="h-10 w-full rounded bg-muted/30 animate-pulse" />
        <div className="h-10 w-full rounded bg-muted/30 animate-pulse" />
        <div className="h-10 w-full rounded bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}
