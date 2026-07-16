import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <Link href="/dashboard" className="text-primary underline hover:text-primary/90">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
