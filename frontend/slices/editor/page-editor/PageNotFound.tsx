import { useNavigate } from "@/shared/lib/router";
import { Button } from "@/shared/ui/button";

export function PageNotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🕊️</div>
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This page may have been moved or deleted.</p>
        <Button onClick={() => navigate("/")}>Back home</Button>
      </div>
    </div>
  );
}
