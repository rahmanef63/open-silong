import { DynamicIcon } from "@/shared/components/icon-picker";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { Page } from "@/shared/types/domain";

export function Section({ title, icon: Icon, children }: any) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Grid({ children }: any) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

export function ActionCard({ icon: Icon, title, subtitle, onClick, primary }: any) {
  return (
    <Button
      onClick={onClick}
      variant={primary ? "default" : "outline"}
      className={cn(
        "group flex h-auto flex-col items-start gap-3 rounded-xl p-5 text-left transition shadow-soft font-normal whitespace-normal",
        primary
          ? "bg-foreground text-background border-foreground hover:bg-foreground hover:opacity-90"
          : "bg-card hover:border-border-strong"
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", primary ? "bg-background/15" : "bg-brand/15 text-brand")}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className={cn("text-sm", primary ? "text-background/70" : "text-muted-foreground")}>{subtitle}</div>
      </div>
    </Button>
  );
}

export function PageCard({ page, onClick }: { page: Page; onClick: () => void }) {
  const preview = page.previewText || "Empty page";
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="group flex h-auto flex-col items-start gap-3 rounded-xl bg-card p-4 text-left transition hover:border-border-strong shadow-soft font-normal whitespace-normal"
    >
      <div
        className="h-16 w-full rounded-md"
        style={{ background: page.cover || "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))" }}
      />
      <div className="flex items-center gap-2">
        <DynamicIcon value={page.icon} className="text-lg" />
        <div className="font-medium text-sm truncate">{page.title || "Untitled"}</div>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2">{preview}</div>
    </Button>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="text-4xl mb-3">📭</div>
      <div className="font-medium">No pages yet</div>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first page to get started.</p>
      <Button onClick={onCreate} className="h-auto rounded-md bg-foreground text-background px-4 py-2 text-sm hover:bg-foreground/90">Create page</Button>
    </div>
  );
}
