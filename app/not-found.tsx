import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold font-serif mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-4">
          That page wandered off. Try the workspace home.
        </p>
        <Link href="/" className="text-sm text-brand hover:underline">
          Go to workspace
        </Link>
      </div>
    </div>
  );
}
