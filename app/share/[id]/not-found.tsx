import Link from "next/link";
import { Lock } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <div className="flex h-12 w-12 items-center justify-center mx-auto rounded-full bg-muted mb-4">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold mb-1">This page is private</h1>
        <p className="text-sm text-muted-foreground mb-4">
          The page you&apos;re looking for is not publicly shared.
        </p>
        <Link href="/" className="text-sm text-brand hover:underline">
          Go to workspace
        </Link>
      </div>
    </div>
  );
}
