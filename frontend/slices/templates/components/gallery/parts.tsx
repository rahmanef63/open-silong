import { useMemo } from "react";
import { FileText, Rows3, Database } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { templateStats } from "../../lib/previewTemplate";

export interface TemplateMeta {
  _id: string;
  name: string;
  icon: string;
  category: string;
  description?: string | null;
}

export function CategoryRow({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors shrink-0 whitespace-nowrap",
        active
          ? "bg-brand/15 text-brand font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "text-[10px] tabular-nums rounded px-1.5 py-0.5 shrink-0",
          active ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function TemplateCard({
  tpl, active, onSelect,
}: {
  tpl: TemplateMeta;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border bg-card p-3 text-left transition-all",
        active
          ? "border-brand ring-2 ring-brand/30 shadow-sm"
          : "border-border hover:border-foreground/30 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-2.5 w-full">
        <div className="text-2xl shrink-0 leading-none">
          <DynamicIcon value={tpl.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{tpl.name}</div>
          {tpl.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {tpl.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 mt-auto">
        <span className="rounded-full bg-muted px-2 py-0.5 truncate max-w-[140px]">
          {tpl.category}
        </span>
      </div>
    </button>
  );
}

export function StatsRow({ json }: { json: unknown }) {
  const stats = useMemo(() => templateStats(json), [json]);
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3" /> {stats.pages} {stats.pages === 1 ? "page" : "pages"}
      </span>
      <span className="flex items-center gap-1">
        <Rows3 className="h-3 w-3" /> {stats.blocks} blocks
      </span>
      {stats.databases > 0 && (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" /> {stats.databases} {stats.databases === 1 ? "DB" : "DBs"}
        </span>
      )}
    </div>
  );
}
