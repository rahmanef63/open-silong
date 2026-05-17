import { AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { Button } from "@/shared/ui/button";
import type { Database, DatabaseViewConfig, Page, Property } from "@/shared/types/domain";

export function ModeToggle({ db, view }: { db: Database; view: DatabaseViewConfig }) {
  const { updateView } = useStore();
  const mode = view.calendarMode ?? "month";
  return (
    <div className="ml-1 inline-flex rounded-md border border-border bg-card p-0.5 text-[11px]">
      {(["month", "week"] as const).map((m) => (
        <Button
          key={m}
          variant="ghost"
          onClick={() => updateView(db.id, view.id, { calendarMode: m })}
          className={cn(
            "h-auto rounded px-2 py-0.5 text-[11px] font-normal",
            mode === m ? "bg-brand text-white font-medium hover:bg-brand hover:text-white" : "text-muted-foreground hover:bg-accent",
          )}
        >{m === "week" ? "Week" : "Month"}</Button>
      ))}
    </div>
  );
}

export function OverflowPanel({
  title, rows, tone, onOpenRow, onDeleteRow,
}: {
  title: string;
  rows: Page[];
  tone: "destructive" | "muted";
  onOpenRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}) {
  const headerCls = tone === "destructive"
    ? "text-destructive bg-destructive/10 border-destructive/30"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b", headerCls)}>
        {tone === "destructive" && <AlertCircle className="h-3.5 w-3.5" />}
        {title}
      </div>
      <div className="divide-y divide-border max-h-40 overflow-y-auto">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/40 group">
            <Button variant="ghost" onClick={() => onOpenRow(r.id)} className="h-auto flex-1 justify-start truncate p-0 text-xs font-normal hover:bg-transparent">
              <DynamicIcon value={r.icon} className="text-xs mr-1 inline-flex" />{r.title || "Untitled"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onDeleteRow(r.id)}
              className="h-auto p-0 text-muted-foreground opacity-0 hover:bg-transparent hover:text-destructive group-hover:opacity-100 [&_svg]:size-3.5"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({ prop }: { prop: Property }) {
  if (!prop.options?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      <span>Legend:</span>
      {prop.options.map((o) => (
        <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>
          {o.name}
        </span>
      ))}
    </div>
  );
}
